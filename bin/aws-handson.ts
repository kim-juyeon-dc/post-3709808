#!/usr/bin/env node
import * as cdk         from 'aws-cdk-lib';
import getMyIpAddress 	from '@/lib/utils/getMyIPAddress';
import { MainStack } 	from '@/lib/main-stack';
import { WAFStack } 	from '@/lib/waf-stack';

// types
// import type { MainStackProps } from '@/lib/main-stack';
// import type { WAFStackProps }  from '@/lib/waf-stack';


const main = async () => {
	const app = new cdk.App();

	const yourIpAddress = await getMyIpAddress();

	if (yourIpAddress) {

		// global(us-east-1) region
		const wafStack = new WAFStack(app, 'WafStack', {
			env: { region: 'us-east-1' },
			yourIpAddress,
			crossRegionReferences: true,
		});

		// tokyo region
		new MainStack(app, 'MainStack', {
			env: { region: 'ap-northeast-1' },
			yourIpAddress,
			crossRegionReferences: true,
			webAclArn: wafStack.webAclArn,
		});
	}
}
main();
