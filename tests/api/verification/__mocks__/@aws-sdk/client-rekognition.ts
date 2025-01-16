interface Label {
  Name: string;
  Confidence: number;
}

export enum QualityFilter {
  AUTO = 'AUTO',
  NONE = 'NONE',
  HIGH = 'HIGH'
}

export class RekognitionClient {
  constructor(config: any) {}

  send(command: any) {
    if (command instanceof DetectFacesCommand) {
      return Promise.resolve({
        FaceDetails: [{
          Confidence: 99.9,
          Quality: {
            Brightness: 80,
            Sharpness: 90
          },
          BoundingBox: {
            Left: 0.1,
            Top: 0.1,
            Width: 0.8,
            Height: 0.8
          }
        }]
      });
    }
    if (command instanceof DetectLabelsCommand) {
      const imageBytes = command.input.Image.Bytes.toString();
      const labels: Label[] = [];
      
      if (imageBytes.includes('license')) {
        labels.push({ Name: 'Drivers License', Confidence: 95.5 });
      } else if (imageBytes.includes('passport')) {
        labels.push({ Name: 'Passport', Confidence: 95.5 });
      } else {
        labels.push({ Name: 'ID Card', Confidence: 95.5 });
      }

      return Promise.resolve({ Labels: labels });
    }
    return Promise.resolve({});
  }
}

export class DetectFacesCommand {
  constructor(public input: any) {}
}

export class DetectLabelsCommand {
  constructor(public input: any) {}
}

export class CompareFacesCommand {
  constructor(public input: any) {}
}

export class IndexFacesCommand {
  constructor(public input: any) {}
}

export class SearchFacesByImageCommand {
  constructor(public input: any) {}
}

export class DeleteFacesCommand {
  constructor(public input: any) {}
}
