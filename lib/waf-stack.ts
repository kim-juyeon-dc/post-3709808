import * as cdk		    from 'aws-cdk-lib';
import { Construct }    from 'constructs';
import * as wafv2		from 'aws-cdk-lib/aws-wafv2';

export interface WAFStackProps extends cdk.StackProps {
    yourIpAddress: string;
}

export class WAFStack extends cdk.Stack {

    public readonly webAclArn: string;

    constructor(scope: Construct, id: string, props: WAFStackProps) {
        super(scope, id, props);

        const {
            yourIpAddress,
        } = props;

        // ip set for allowed ips (mynavi office + remote work ips)
        const ipSet = new wafv2.CfnIPSet(this, 'your-waf', {
            name: 'your-waf-name',
            scope: 'CLOUDFRONT', // global for cloudfront
            ipAddressVersion: 'IPV4',
            addresses: [
                '210.190.113.128/25', // mynavi office ip range
                /**
                 * you'll get a different ip address to your actual local ip address if you're working on it in ec2 instance for dev environment
                 */
                yourIpAddress, // add your remote work ip here if needed
            ],
        });

        // using cloudformation level constructs (prolly L1?) because it seems like there's no l2 constructs waf v2 yet.
        // waf web access contro, list with managed rules and ip allowlist
        const webAcl = new wafv2.CfnWebACL(this, 'your-web-acl', {
            name: 'your-web-acl-name',
            scope: 'CLOUDFRONT',
            defaultAction: { block: {} }, // block by default
            rules: [
                // allow specific ips first (highest priority)
                {
                    name: 'your-web-acl-rule',
                    priority: 0,
                    statement: {
                        ipSetReferenceStatement: {
                            arn: ipSet.attrArn,
                        },
                    },
                    action: { allow: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'your-acl-metric',
                    },
                },
                // aws managed rule: core rule set
                {
                    name: 'AWSManagedRulesCore',
                    priority: 1,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesCommonRuleSet',
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesCore',
                    },
                },
                // aws managed rule: ip reputation list
                {
                    name: 'AWSManagedRulesIPReputation',
                    priority: 2,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesAmazonIpReputationList',
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesIPReputation',
                    },
                },
                // aws managed rule: anonymous ip list
                {
                    name: 'AWSManagedRulesAnonymousIP',
                    priority: 3,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                        vendorName: 'AWS',
                        name: 'AWSManagedRulesAnonymousIpList',
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesAnonymousIP',
                    },
                },
            ],
            visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: 'your-cloudwatch-metric-name',
            },
        });

        this.webAclArn = webAcl.attrArn;

        new cdk.CfnOutput(this, 'WebAclArn', {
            value: this.webAclArn,
            exportName: 'WebAclArn'
        });
    }
}
