import axios from 'axios';
import { FileUpload } from '../types';
import { Readable } from 'stream';

interface WhatsAppMedia {
  id: string;
  url?: string;
}

interface WhatsAppMessage {
  image?: WhatsAppMedia;
  type?: string;
}

class WhatsAppClient {
  private static instance: WhatsAppClient;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  private constructor() {
    this.baseUrl = process.env.WHATSAPP_API_URL || '';
    this.apiKey = process.env.WHATSAPP_API_KEY || '';

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('WhatsApp API configuration missing');
    }
  }

  public static getInstance(): WhatsAppClient {
    if (!WhatsAppClient.instance) {
      WhatsAppClient.instance = new WhatsAppClient();
    }
    return WhatsAppClient.instance;
  }

  public async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/media/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.data.url) {
        throw new Error('Media URL not found');
      }

      return response.data.url;
    } catch (error) {
      console.error('Failed to get media URL:', error);
      throw new Error('Failed to retrieve media URL');
    }
  }

  public async downloadMedia(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Failed to download media:', error);
      throw new Error('Failed to download media');
    }
  }
}

export const handleWhatsAppMedia = async (message: WhatsAppMessage): Promise<FileUpload> => {
  try {
    if (!message.image?.id) {
      throw new Error('No image found in message');
    }

    const whatsapp = WhatsAppClient.getInstance();
    const mediaUrl = await whatsapp.getMediaUrl(message.image.id);
    const mediaBuffer = await whatsapp.downloadMedia(mediaUrl);

    const filename = `${message.image.id}.jpg`;
    const stream = new Readable();
    stream.push(mediaBuffer);
    stream.push(null);

    return {
      fieldname: 'photo',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: mediaBuffer.length,
      destination: '/tmp',
      filename: filename,
      path: `/tmp/${filename}`,
      buffer: mediaBuffer,
      stream
    };
  } catch (error) {
    console.error('WhatsApp media handling error:', error);
    throw error;
  }
};

export const determinePhotoType = (message: WhatsAppMessage): 'id' | 'selfie' => {
  return message.type === 'id_document' ? 'id' : 'selfie';
};

export default WhatsAppClient;
