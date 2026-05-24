import type { Destination, DiaryEntry } from '../types';

export const DEFAULT_TRAVEL_IMAGE_URL =
  'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201200%20675%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22sky%22%20x1%3D%220%22%20x2%3D%221%22%20y1%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%238fc7ff%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23ffe1a6%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%221200%22%20height%3D%22675%22%20fill%3D%22url(%23sky)%22%2F%3E%3Cpath%20d%3D%22M0%20505%20C170%20405%20305%20455%20480%20348%20C650%20245%20780%20345%20935%20255%20C1045%20192%201135%20228%201200%20190%20L1200%20675%20L0%20675Z%22%20fill%3D%22%23356b7a%22%20opacity%3D%22.86%22%2F%3E%3Cpath%20d%3D%22M0%20590%20C210%20535%20408%20558%20615%20495%20C835%20428%201000%20485%201200%20440%20L1200%20675%20L0%20675Z%22%20fill%3D%22%232f8f83%22%2F%3E%3Ccircle%20cx%3D%22945%22%20cy%3D%22142%22%20r%3D%2265%22%20fill%3D%22%23fff4bf%22%20opacity%3D%22.9%22%2F%3E%3Cpath%20d%3D%22M190%20438%20C320%20362%20438%20362%20562%20438%22%20fill%3D%22none%22%20stroke%3D%22%23fff9df%22%20stroke-width%3D%2218%22%20stroke-linecap%3D%22round%22%20opacity%3D%22.8%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%22615%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2242%22%20fill%3D%22%23ffffff%22%20opacity%3D%22.9%22%3ETravel%20Memory%3C%2Ftext%3E%3C%2Fsvg%3E';

const isUsableImageUrl = (url?: string | null) => Boolean(url?.trim());
const isPlaceholderImageUrl = (url?: string | null) => Boolean(url?.includes('_mock-visual.svg'));

const uniqueUrls = (urls: string[]) => Array.from(new Set(urls));

export const imageService = {
  getDefaultImage(): string {
    return DEFAULT_TRAVEL_IMAGE_URL;
  },

  getDestinationImage(destination?: Destination): string {
    if (!destination) return DEFAULT_TRAVEL_IMAGE_URL;
    const destinationImages = [
      destination.coverImageUrl,
      ...(Array.isArray(destination.imageUrls) ? destination.imageUrls : []),
    ];
    return destinationImages.find((url) => isUsableImageUrl(url) && !isPlaceholderImageUrl(url))?.trim() ?? DEFAULT_TRAVEL_IMAGE_URL;
  },

  getDiaryEntryImage(destination: Destination, stopIndex: number): string {
    const imageUrls = Array.isArray(destination.imageUrls)
      ? destination.imageUrls.filter((url) => isUsableImageUrl(url) && !isPlaceholderImageUrl(url))
      : [];
    const indexedImage = imageUrls.length ? imageUrls[(stopIndex - 1) % imageUrls.length] : undefined;
    return indexedImage?.trim() ?? this.getDestinationImage(destination);
  },

  normalizeDiaryEntries(entries: DiaryEntry[], destination: Destination): DiaryEntry[] {
    return entries.map((entry, index) => ({
      ...entry,
      imageUrl: isUsableImageUrl(entry.imageUrl) && !isPlaceholderImageUrl(entry.imageUrl) ? entry.imageUrl.trim() : this.getDiaryEntryImage(destination, index + 1),
    }));
  },

  async searchImages(destination: Destination): Promise<string[]> {
    return Promise.resolve(uniqueUrls([this.getDestinationImage(destination), ...destination.imageUrls.filter(isUsableImageUrl)]));
  },

  async getFallbackImages(destination: Destination): Promise<string[]> {
    return Promise.resolve(
      uniqueUrls([
        this.getDestinationImage(destination),
        ...(Array.isArray(destination.imageUrls) ? destination.imageUrls.filter(isUsableImageUrl) : []),
        DEFAULT_TRAVEL_IMAGE_URL,
      ]),
    );
  },

  async generateTravelImage(imagePrompt: string, destination?: Destination): Promise<{ imageUrl: string }> {
    const prompt = imagePrompt?.trim();
    if (!prompt) {
      return { imageUrl: destination ? this.getDestinationImage(destination) : DEFAULT_TRAVEL_IMAGE_URL };
    }

    try {
      const response = await fetch('/.netlify/functions/image-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        return { imageUrl: destination ? this.getDestinationImage(destination) : DEFAULT_TRAVEL_IMAGE_URL };
      }
      const data = (await response.json()) as { imageUrl?: unknown };
      const url = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '';
      if (url) return { imageUrl: url };
      return { imageUrl: destination ? this.getDestinationImage(destination) : DEFAULT_TRAVEL_IMAGE_URL };
    } catch {
      return { imageUrl: destination ? this.getDestinationImage(destination) : DEFAULT_TRAVEL_IMAGE_URL };
    }
  },
};
