# AWS CLI v2

This bundle contains a built executable of the AWS CLI v2.

## Installation

To install the AWS CLI v2, run the `install` script:
```
$ sudo ./install 
You can now run: /usr/local/bin/aws --version
```
This will install the AWS CLI v2 at `/usr/local/bin/aws`.  Assuming
`/usr/local/bin` is on your `PATH`, you can now run:
```
$ aws --version
```


### Installing without sudo

If you don't have ``sudo`` permissions or want to install the AWS
CLI v2 only for the current user, run the `install` script with the `-b`
and `-i` options:
```
$ ./install -i ~/.local/aws-cli -b ~/.local/bin
``` 
This will install the AWS CLI v2 in `~/.local/aws-cli` and create
symlinks for `aws` and `aws_completer` in `~/.local/bin`. For more
information about these options, run the `install` script with `-h`:
```
$ ./install -h
```

### Updating

If you run the `install` script and there is a previously installed version
of the AWS CLI v2, the script will error out. To update to the version included
in this bundle, run the `install` script with `--update`:
```
$ sudo ./install --update
```


### Removing the installation

To remove the AWS CLI v2, delete the its installation and symlinks:
```
$ sudo rm -rf /usr/local/aws-cli
$ sudo rm /usr/local/bin/aws
$ sudo rm /usr/local/bin/aws_completer
```
Note if you installed the AWS CLI v2 using the `-b` or `-i` options, you will
need to remove the installation and the symlinks in the directories you
specified.

# Fetchlogs Tool

The `fetchlogs.js` script is a utility for fetching and streaming logs from AWS CloudWatch for the Credex Core development environment.

## Usage

```
fetchlogs [seconds]
```

- Without arguments: Streams logs in real-time
- With a number argument: Fetches historical logs from the specified number of seconds ago

## Setup in Devcontainer

When using the devcontainer, the fetchlogs tool is automatically set up during container creation with the following steps (from devcontainer.json):

1. The script is made executable:
   ```
   chmod +x aws/fetchlogs.js
   ```

2. A symbolic link is created to make it available as a command:
   ```
   sudo ln -s "${containerWorkspaceFolder}/aws/fetchlogs.js" /usr/local/bin/fetchlogs
   ```

3. AWS credentials are automatically set as environment variables:
   ```
   "remoteEnv": {
     "NODE_ENV":"development",
     "AWS_REGION": "af-south-1",
     "AWS_ACCESS_KEY_ID": "${localEnv:CREDEX_CORE_DEV_AWS_ACCESS_KEY_ID}",
     "AWS_SECRET_ACCESS_KEY": "${localEnv:CREDEX_CORE_DEV_AWS_SECRET_ACCESS_KEY}"
   }
   ```

## Setup Outside Devcontainer

To use fetchlogs outside the devcontainer:

1. Make sure the script is executable:
   ```
   chmod +x aws/fetchlogs.js
   ```

2. Create a symbolic link to make it available as a command:
   ```
   sudo ln -s "${PWD}/aws/fetchlogs.js" /usr/local/bin/fetchlogs
   ```

3. Set the required AWS environment variables by sourcing the provided script:
   ```
   source aws/set-aws-env.sh
   ```
   
   You can run this from either the project root or the aws directory.

4. Run fetchlogs:
   ```
   fetchlogs
   ```

The `set-aws-env.sh` script sets the following environment variables from your .env file:
- AWS_REGION="af-south-1"
- AWS_ACCESS_KEY_ID and AWS_ACCESS_KEY (from your .env file)
- AWS_SECRET_ACCESS_KEY (from your .env file)

### Troubleshooting

If you encounter credential errors when running fetchlogs, check that:

1. Your .env file contains the correct AWS credentials:
   - AWS_ACCESS_KEY=your_access_key
   - AWS_SECRET_ACCESS_KEY=your_secret_key

2. The set-aws-env.sh script was sourced correctly:
   ```
   source aws/set-aws-env.sh
   ```
   
   You should see output confirming the credentials were set.

3. Verify the environment variables were set correctly:
   ```
   echo $AWS_ACCESS_KEY_ID
   echo $AWS_ACCESS_KEY
   echo $AWS_SECRET_ACCESS_KEY
