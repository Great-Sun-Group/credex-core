# Monitoring and Troubleshooting

This document outlines the monitoring setup for the credex-core application and Neo4j instances, and provides guidance on troubleshooting common issues.

## Monitoring

### CloudWatch Logs

ECS task logs are sent to CloudWatch Logs:

- Log group: `/ecs/credex-core-${environment}`
- Log stream prefix: `ecs`
- AWS region: af-south-1 (Cape Town)

### CloudWatch Alarms

Set up CloudWatch Alarms for important metrics such as:

- CPU and Memory utilization of ECS tasks and EC2 instances
- Number of running tasks
- Disk space usage on EC2 instances
- Network In/Out for EC2 instances
- Application-specific metrics (if pushed to CloudWatch)

### Neo4j-Specific Monitoring

1. Enable JMX monitoring for Neo4j instances
2. Monitor key Neo4j metrics:
   - Active transactions
   - Cache hit ratio
   - Page cache usage
   - Heap memory usage

3. Set up log filters and metrics in CloudWatch Logs to detect:
   - Error messages in Neo4j logs
   - Slow queries
   - Authentication failures

4. Implement a scheduled task to check the Neo4j license expiration date

### Application Performance Monitoring

Consider implementing an Application Performance Monitoring (APM) solution for detailed insights into the application's performance and behavior, including its interaction with Neo4j.

## Maintenance Procedures

### Regular Backups

1. Configure daily backups of Neo4j data
2. Store backups in a separate AWS S3 bucket
3. Regularly test the restore process

### Version Updates

1. Keep track of Neo4j version releases
2. Test new versions in the development environment before upgrading staging and production
3. Schedule version updates during off-peak hours

### Performance Tuning

1. Regularly review and optimize Neo4j configuration
2. Analyze slow query logs and optimize frequently used queries
3. Monitor and adjust EC2 instance sizes based on usage patterns

### Security Updates

1. Regularly apply security patches to Neo4j and other system components
2. Review and update security groups and network access rules
3. Rotate credentials periodically

## Troubleshooting

### Deployment Issues

If you encounter issues during deployment:

1. Check GitHub Actions logs for deployment failure error messages
2. Verify all required secrets are correctly set up in GitHub repository secrets
3. Ensure the ECS task definition is correctly updated with the new image and environment variables
4. Check Terraform logs for any errors during infrastructure provisioning

### Application Issues

For issues with the running application:

1. Check CloudWatch logs for the ECS tasks
2. Verify the application's connection to Neo4j instances
3. For Neo4j issues, check EC2 instance logs and ensure the Neo4j service is running

### Neo4j-Specific Issues

1. License not applied correctly:
   - Verify the `NEO4J_ENTERPRISE_LICENSE` secret in GitHub
   - Check Terraform logs for any errors during license application

2. Neo4j instance not starting:
   - Check instance logs in AWS CloudWatch
   - Verify security group settings and resource allocation

3. Unable to connect to Neo4j:
   - Verify network configuration and security group rules
   - Check Neo4j process status on the instance

4. Performance issues:
   - Review monitoring metrics for resource bottlenecks
   - Analyze slow query logs
   - Consider scaling up instance size or optimizing queries

### Infrastructure Issues

For issues related to the AWS infrastructure:

1. Check the ECS cluster status
2. Verify the EC2 instances for Neo4j are running correctly
3. For AMI creation issues, review the Terraform execution logs

### General Troubleshooting Steps

1. Review recent changes in code, configuration, or infrastructure
2. Verify environment variables are correctly set
3. Check dependencies and their accessibility
4. Analyze metrics for unusual patterns or spikes
5. Test in lower environments when possible
6. Consider rolling back if the issue is severe and can't be quickly resolved

## Reporting

Generate weekly reports on instance performance, query performance, error rates, and backup status. Conduct monthly reviews of the monitoring and maintenance procedures.

By following these guidelines, you can ensure the reliability and performance of the credex-core application and its Neo4j instances across all environments.
