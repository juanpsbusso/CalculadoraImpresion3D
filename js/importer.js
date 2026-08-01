/**
 * Web Link Importer for Thingiverse, Printables, and Cults3D
 */
class ModelImporter {
  /**
   * Fetch model details from URL
   * @param {string} targetUrl 
   */
  static async importFromUrl(targetUrl) {
    if (!targetUrl || !targetUrl.trim()) {
      throw new Error('Por favor ingresa un enlace válido.');
    }

    const cleanUrl = targetUrl.trim();

    try {
      // Call Vercel Serverless / Local Python endpoint
      const response = await fetch(`/api/fetch-model?url=${encodeURIComponent(cleanUrl)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.error) {
          return this.fallbackParse(cleanUrl, data.error);
        }
        return data;
      }
    } catch (e) {
      console.warn('API route not available, using client fallback', e);
    }

    return this.fallbackParse(cleanUrl);
  }

  static fallbackParse(url, apiError = null) {
    let source = 'Web';
    if (url.includes('thingiverse.com')) source = 'Thingiverse';
    else if (url.includes('printables.com')) source = 'Printables';
    else if (url.includes('cults3d.com')) source = 'Cults3D';
    else if (url.includes('makerworld.com')) source = 'MakerWorld';

    // Extract title from URL path
    const parts = url.split('/').filter(p => p.length > 0);
    let title = parts[parts.length - 1] || 'Modelo 3D Importado';
    title = decodeURIComponent(title).replace(/[-_]/g, ' ');
    // Capitalize title
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
      source,
      title,
      image: null,
      url,
      note: apiError || 'Información importada desde el enlace'
    };
  }
}
