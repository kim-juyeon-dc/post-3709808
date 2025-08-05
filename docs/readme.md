# AWS Hands-on

## Description

This repository contains the AWS CDK implementation of the cloud infrastructure described in [the original AWS Console tutorial](https://mynavi.docbase.io/posts/3709808). If you've been following the console-based tutorial and want to see how the same architecture can be built using Infrastructure as Code, this CDK application provides the equivalent implementation.

## Why Use CDK Instead?

While the console tutorial teaches you the fundamentals, this CDK implementation offers:

- Reproducible Infrastructure - Deploy the same setup multiple times
- Version Control - Track changes to your infrastructure over time
- Automation - No manual clicking required
- Best Practices - Code includes proper naming and tagging conventions

## Steps

**Initiate ts cdk app:**
```bash
cdk init app --language typescript
```

## References

- [【AWSハンズオン①】CloudFrontとS3を使った静的Webサイトの作成](https://mynavi.docbase.io/posts/3709808)
