const { RekognitionClient, ListCollectionsCommand } = require("@aws-sdk/client-rekognition");
const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");
const dotenv = require('dotenv');

dotenv.config();

// Configure AWS credentials with us-east-1 region since Rekognition/Textract aren't available in af-south-1
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: 'us-east-1' // Using us-east-1 since Rekognition/Textract aren't available in af-south-1
};

console.log('Testing AWS credentials...');
console.log('Access Key:', credentials.accessKeyId ? credentials.accessKeyId.substring(0, 5) + '...' : 'Not found');
console.log('Secret Key:', credentials.secretAccessKey ? 'Present (hidden)' : 'Not found');
console.log('Region:', credentials.region);

async function testConnections() {
  try {
    // Test Rekognition
    const rekognition = new RekognitionClient(credentials);
    console.log('\nTesting Rekognition connection...');
    const rekognitionResponse = await rekognition.send(new ListCollectionsCommand({}));
    console.log('Rekognition connection successful!');
    console.log('Collections:', rekognitionResponse.CollectionIds);

    // Test Textract
    const textract = new TextractClient(credentials);
    console.log('\nTesting Textract connection...');
    const textractResponse = await textract.send(new AnalyzeDocumentCommand({
      Document: {
        Bytes: Buffer.from('Test')
      },
      FeatureTypes: ['FORMS']
    }));
    console.log('Textract connection successful!');
  } catch (error) {
    console.error('Error testing AWS connections:', error.message);
  }
}

testConnections();
