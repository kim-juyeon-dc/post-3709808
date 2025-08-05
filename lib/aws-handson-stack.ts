import * as cdk		    from 'aws-cdk-lib';
import { Construct }    from 'constructs';
import * as iam		    from 'aws-cdk-lib/aws-iam';
import * as s3		    from 'aws-cdk-lib/aws-s3';
import * as s3deploy    from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront  from 'aws-cdk-lib/aws-cloudfront';
import * as origins		from 'aws-cdk-lib/aws-cloudfront-origins';
import * as logs 		from 'aws-cdk-lib/aws-logs';
import * as wafv2		from 'aws-cdk-lib/aws-wafv2';

export interface AwsHandsonStackProps extends cdk.StackProps {
  	yourIpAddress: string;
}

export class AwsHandsonStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: AwsHandsonStackProps) {
		super(scope, id, props);

		const {
			yourIpAddress,
		} = props;
		
		// create your first bucket
		const yourBucket = new s3.Bucket(this, 'your-bucket', {
			bucketName: 'your-bucket',
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
		});

		// add resources for your bucket
		new s3deploy.BucketDeployment(this, 'deploy-website', {
			sources: [s3deploy.Source.asset('./statics')],
			destinationBucket: yourBucket,
			destinationKeyPrefix: '/'
		});

		// IAM policy
		const yourBasicS3Policy = new iam.ManagedPolicy(this, 'your-basic-S3-policy', {
			managedPolicyName: 'your-basic-s3-policy',
			description: 'S3 access policy with IP address restriction',
			statements: [
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: [
						's3:PutObject',
						's3:GetObject',
						's3:DeleteObject'
					],
					resources: [ yourBucket.arnForObjects('*') ],
					conditions: {
						IpAddress: {
							'aws:SourceIp': yourIpAddress,
						}
					},
				}),
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: ['s3:ListBucket'],
					resources: [ yourBucket.bucketArn ],
					conditions: {
						IpAddress: {
							'aws:SourceIp': yourIpAddress,
						}
					},
				}),
			],
		});

		// define your iam user
		const yourIAMUser = new iam.User(this, 'your-iam-user', {
			userName: 'your-iam-user',
			managedPolicies: [ yourBasicS3Policy, ],
		});
		const accessKey = new iam.AccessKey(this, 'your-iam-user-access-key', {
			user: yourIAMUser,
		});

		// cloudWatch Logs group for cf logging
		const logGroup = new logs.LogGroup(this, 'your-cloudfront-log-group', {
				logGroupName: '/aws/cloudfront/yourname', // it's value doesn't have to be path notation
				retention: logs.RetentionDays.ONE_MONTH, // how long the log will be retained
				removalPolicy: cdk.RemovalPolicy.DESTROY, // (?) destroy logs when the stack is deleted
			});

		// s3 bucket for cf access logs
		const logBucket = new s3.Bucket(this, 'cloudfront-log-bucket', {
			bucketName: 'your-bucket-for-logs',
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: true, // delete objects when bucket or stack gets deleted
		});

		// your cf dist
		const yourDistribution = new cloudfront.Distribution(this, 'your-distribution', {
			defaultBehavior: {
				origin: origins.S3BucketOrigin.withOriginAccessControl(yourBucket), // oac
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // redirect 80 to 443
				allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD, // allow HEAD and GET only
				compress: true, // compress files for the cache behavior
			},
			defaultRootObject: 'index.html',
			webAclId: undefined, // though it's the default setup, explicitly specify aws waf web acl is undefined
			enableLogging: true,
			logBucket,
			errorResponses: [
				{
					httpStatus: 403,
					responseHttpStatus: 404,
				},
			],
		});

		// ip set for allowed ips (mynavi office + remote work ips)
		const ipSet = new wafv2.CfnIPSet(this, 'your-waf', {
			name: 'your waf name',
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

		// output
		new cdk.CfnOutput(this, 'WebsiteURL', {
			value: `https://${yourDistribution.distributionDomainName}`,
			description: 'cloudfront URL',
		});

	}
}
