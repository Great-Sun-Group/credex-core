const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateTestImages() {
  try {
    const outputDir = path.join(__dirname);
    console.log('Output directory:', outputDir);

    // Create valid selfie
    const validSelfiePath = path.join(outputDir, 'valid-selfie.jpg');
    console.log('Creating valid selfie at:', validSelfiePath);
    
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 220, g: 190, b: 160 }
      }
    })
    .composite([
      {
        input: {
          create: {
            width: 50,
            height: 50,
            channels: 3,
            background: { r: 50, g: 50, b: 50 }
          }
        },
        left: 300,
        top: 250
      },
      {
        input: {
          create: {
            width: 50,
            height: 50,
            channels: 3,
            background: { r: 50, g: 50, b: 50 }
          }
        },
        left: 450,
        top: 250
      },
      {
        input: {
          create: {
            width: 100,
            height: 20,
            channels: 3,
            background: { r: 150, g: 50, b: 50 }
          }
        },
        left: 350,
        top: 350
      }
    ])
    .toColorspace('srgb')
    .jpeg()
    .toFile(validSelfiePath);

    console.log('Valid selfie created successfully');

    // Create blurry selfie
    const blurrySelfiePath = path.join(outputDir, 'blurry-selfie.jpg');
    console.log('Creating blurry selfie at:', blurrySelfiePath);
    
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 220, g: 190, b: 160 }
      }
    })
    .toColorspace('srgb')
    .blur(10)
    .jpeg()
    .toFile(blurrySelfiePath);

    console.log('Blurry selfie created successfully');

    // Create dark selfie
    const darkSelfiePath = path.join(outputDir, 'dark-selfie.jpg');
    console.log('Creating dark selfie at:', darkSelfiePath);
    
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 220, g: 190, b: 160 }
      }
    })
    .toColorspace('srgb')
    .modulate({ brightness: 0.3 })
    .jpeg()
    .toFile(darkSelfiePath);

    console.log('Dark selfie created successfully');

    // Create no face image
    const noFacePath = path.join(outputDir, 'no-face.jpg');
    console.log('Creating no face image at:', noFacePath);
    
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 200, g: 200, b: 200 }
      }
    })
    .toColorspace('srgb')
    .jpeg()
    .toFile(noFacePath);

    console.log('No face image created successfully');

    // Create valid ID document
    const validIdPath = path.join(outputDir, 'valid-id.jpg');
    console.log('Creating valid ID at:', validIdPath);
    
    await sharp({
      create: {
        width: 1000,
        height: 650,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([
      {
        input: {
          create: {
            width: 200,
            height: 250,
            channels: 3,
            background: { r: 220, g: 190, b: 160 }
          }
        },
        left: 50,
        top: 100
      },
      {
        input: {
          create: {
            width: 600,
            height: 30,
            channels: 3,
            background: { r: 0, g: 0, b: 0 }
          }
        },
        left: 300,
        top: 100
      },
      {
        input: {
          create: {
            width: 600,
            height: 30,
            channels: 3,
            background: { r: 0, g: 0, b: 0 }
          }
        },
        left: 300,
        top: 200
      }
    ])
    .toColorspace('srgb')
    .jpeg()
    .toFile(validIdPath);

    console.log('Valid ID created successfully');

    // Create blurry ID
    const blurryIdPath = path.join(outputDir, 'blurry-id.jpg');
    console.log('Creating blurry ID at:', blurryIdPath);
    
    await sharp({
      create: {
        width: 1000,
        height: 650,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .toColorspace('srgb')
    .blur(10)
    .jpeg()
    .toFile(blurryIdPath);

    console.log('Blurry ID created successfully');

    // Create non-document image
    const nonDocPath = path.join(outputDir, 'non-document.jpg');
    console.log('Creating non-document image at:', nonDocPath);
    
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    })
    .toColorspace('srgb')
    .jpeg()
    .toFile(nonDocPath);

    console.log('Non-document image created successfully');

    // Create low resolution image
    const lowResPath = path.join(outputDir, 'low-res.jpg');
    console.log('Creating low resolution image at:', lowResPath);
    
    await sharp({
      create: {
        width: 320,
        height: 240,
        channels: 3,
        background: { r: 220, g: 190, b: 160 }
      }
    })
    .toColorspace('srgb')
    .jpeg()
    .toFile(lowResPath);

    console.log('Low resolution image created successfully');
    console.log('All test images generated successfully');

  } catch (error) {
    console.error('Error generating test images:', error);
    throw error;
  }
}

generateTestImages().catch(console.error);
