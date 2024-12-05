import axios from 'axios';
import WhatsAppClient, { handleWhatsAppMedia, determinePhotoType } from '../../../../src/api/verification/services/whatsappService';
import { Readable } from 'stream';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WhatsApp Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      WHATSAPP_API_URL: 'https://api.whatsapp.com',
      WHATSAPP_API_KEY: 'test-api-key'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('WhatsAppClient', () => {
    it('should throw error if configuration is missing', () => {
      process.env.WHATSAPP_API_URL = '';
      process.env.WHATSAPP_API_KEY = '';

      expect(() => WhatsAppClient.getInstance()).toThrow('WhatsApp API configuration missing');
    });

    it('should return the same instance', () => {
      const instance1 = WhatsAppClient.getInstance();
      const instance2 = WhatsAppClient.getInstance();

      expect(instance1).toBe(instance2);
    });

    describe('getMediaUrl', () => {
      it('should successfully retrieve media URL', async () => {
        const mediaId = 'test-media-id';
        const expectedUrl = 'https://media.whatsapp.com/test-image.jpg';

        mockedAxios.get.mockResolvedValueOnce({
          data: { url: expectedUrl }
        });

        const client = WhatsAppClient.getInstance();
        const url = await client.getMediaUrl(mediaId);

        expect(url).toBe(expectedUrl);
        expect(mockedAxios.get).toHaveBeenCalledWith(
          'https://api.whatsapp.com/media/test-media-id',
          expect.objectContaining({
            headers: {
              'Authorization': 'Bearer test-api-key'
            }
          })
        );
      });

      it('should throw error if media URL is not found', async () => {
        mockedAxios.get.mockResolvedValueOnce({
          data: {}
        });

        const client = WhatsAppClient.getInstance();
        await expect(client.getMediaUrl('test-media-id'))
          .rejects
          .toThrow('Failed to retrieve media URL');
      });

      it('should handle API errors', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

        const client = WhatsAppClient.getInstance();
        await expect(client.getMediaUrl('test-media-id'))
          .rejects
          .toThrow('Failed to retrieve media URL');
      });
    });

    describe('downloadMedia', () => {
      it('should successfully download media', async () => {
        const mediaUrl = 'https://media.whatsapp.com/test-image.jpg';
        const mockBuffer = Buffer.from('test-image-data');

        mockedAxios.get.mockResolvedValueOnce({
          data: mockBuffer
        });

        const client = WhatsAppClient.getInstance();
        const buffer = await client.downloadMedia(mediaUrl);

        expect(buffer).toEqual(mockBuffer);
        expect(mockedAxios.get).toHaveBeenCalledWith(
          mediaUrl,
          expect.objectContaining({
            responseType: 'arraybuffer',
            headers: {
              'Authorization': 'Bearer test-api-key'
            }
          })
        );
      });

      it('should handle download errors', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('Download Error'));

        const client = WhatsAppClient.getInstance();
        await expect(client.downloadMedia('test-url'))
          .rejects
          .toThrow('Failed to download media');
      });
    });
  });

  describe('handleWhatsAppMedia', () => {
    it('should successfully process WhatsApp image message', async () => {
      const mediaId = 'test-media-id';
      const mediaUrl = 'https://media.whatsapp.com/test-image.jpg';
      const mockBuffer = Buffer.from('test-image-data');

      mockedAxios.get
        .mockResolvedValueOnce({ data: { url: mediaUrl } })
        .mockResolvedValueOnce({ data: mockBuffer });

      const result = await handleWhatsAppMedia({
        image: { id: mediaId }
      });

      expect(result).toEqual({
        fieldname: 'photo',
        originalname: `${mediaId}.jpg`,
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: mockBuffer.length,
        destination: '/tmp',
        filename: `${mediaId}.jpg`,
        path: `/tmp/${mediaId}.jpg`,
        buffer: mockBuffer,
        stream: expect.any(Readable)
      });
    });

    it('should throw error if no image in message', async () => {
      await expect(handleWhatsAppMedia({}))
        .rejects
        .toThrow('No image found in message');
    });

    it('should handle media processing errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Processing Error'));

      await expect(handleWhatsAppMedia({
        image: { id: 'test-media-id' }
      }))
        .rejects
        .toThrow('Failed to retrieve media URL');
    });
  });

  describe('determinePhotoType', () => {
    it('should return "id" for id_document type', () => {
      const result = determinePhotoType({
        type: 'id_document'
      });
      expect(result).toBe('id');
    });

    it('should return "selfie" for non-id types', () => {
      const result = determinePhotoType({
        type: 'other'
      });
      expect(result).toBe('selfie');
    });

    it('should return "selfie" when type is undefined', () => {
      const result = determinePhotoType({});
      expect(result).toBe('selfie');
    });
  });
});
