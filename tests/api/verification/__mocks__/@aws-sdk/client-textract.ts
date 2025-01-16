export const FeatureType = {
  FORMS: 'FORMS',
  TABLES: 'TABLES',
  QUERIES: 'QUERIES'
};

export class TextractClient {
  constructor(config: any) {}

  send(command: any) {
    if (command instanceof DetectDocumentTextCommand) {
      const imageBytes = command.input.Document.Bytes.toString();
      let text = 'Sample Document Text';
      
      if (imageBytes.includes('license')) {
        text = 'DRIVERS LICENSE State ID Number';
      } else if (imageBytes.includes('passport')) {
        text = 'PASSPORT Issuing Country';
      }
      
      return Promise.resolve({
        Blocks: [
          {
            BlockType: 'LINE',
            Text: text,
            Confidence: 95.5,
            Id: '1'
          }
        ],
        DocumentMetadata: {
          Pages: 1
        }
      });
    }
    if (command instanceof AnalyzeDocumentCommand) {
      return Promise.resolve({
        Blocks: [
          {
            BlockType: 'LINE',
            Text: 'Sample Document Text',
            Confidence: 95.5,
            Id: '1'
          },
          {
            BlockType: 'KEY_VALUE_SET',
            EntityTypes: ['KEY'],
            Relationships: [{
              Ids: ['3']
            }],
            Id: '2',
            Confidence: 98.0
          },
          {
            BlockType: 'WORD',
            Text: 'Sample',
            Id: '3',
            Confidence: 99.0
          }
        ],
        DocumentMetadata: {
          Pages: 1
        }
      });
    }
    return Promise.resolve({});
  }
}

export class DetectDocumentTextCommand {
  constructor(public input: any) {}
}

export class AnalyzeDocumentCommand {
  constructor(public input: any) {}
}

export class GetDocumentAnalysisCommand {
  constructor(public input: any) {}
}

export interface Block {
  BlockType?: string;
  Text?: string;
  Id?: string;
  Relationships?: Array<{
    Ids: string[];
  }>;
  EntityTypes?: string[];
  Confidence?: number;
}

export interface DocumentMetadata {
  Pages: number;
}

export type BlockType = 'PAGE' | 'LINE' | 'WORD' | 'TABLE' | 'CELL' | 'KEY_VALUE_SET';
export type EntityType = 'KEY' | 'VALUE';
export interface Relationship {
  Type?: string;
  Ids: string[];
}
