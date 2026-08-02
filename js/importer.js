/**
 * Web Link & Multi-STL Importer for Thingiverse, Printables, and Cults3D
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
    const encodedUrl = encodeURIComponent(cleanUrl);

    const endpoints = [
      `/api/fetch-model?url=${encodedUrl}`,
      `/api/fetch_model?url=${encodedUrl}`,
      `/api/index?url=${encodedUrl}`
    ];

    for (const ep of endpoints) {
      try {
        const response = await fetch(ep);
        if (response.ok) {
          const data = await response.json();
          if (data && !data.error) {
            return data;
          }
          if (data && data.error && !data.error.includes('404')) {
            return this.fallbackParse(cleanUrl, data.error);
          }
        }
      } catch (e) {
        console.warn(`Endpoint ${ep} request failed:`, e);
      }
    }

    return this.fallbackParse(cleanUrl);
  }

  /**
   * Fetch raw STL file ArrayBuffer through backend proxy
   * @param {string} fileUrl 
   */
  static async fetchStlBuffer(fileUrl) {
    const proxyEp = `/api/fetch-stl-proxy?url=${encodeURIComponent(fileUrl)}`;
    const res = await fetch(proxyEp);
    if (!res.ok) {
      throw new Error(`Failed to fetch STL binary (HTTP ${res.status})`);
    }
    return await res.arrayBuffer();
  }

  static fallbackParse(url, apiError = null) {
    let source = 'Web';
    if (url.includes('thingiverse.com')) source = 'Thingiverse';
    else if (url.includes('printables.com')) source = 'Printables';
    else if (url.includes('cults3d.com')) source = 'Cults3D';
    else if (url.includes('makerworld.com')) source = 'MakerWorld';

    const parts = url.split('/').filter(p => p.length > 0);
    let title = parts[parts.length - 1] || 'Modelo 3D Importado';
    title = decodeURIComponent(title).replace(/[-_]/g, ' ');
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
      source,
      title,
      image: null,
      url,
      files: [],
      note: apiError || 'Información importada desde el enlace'
    };
  }
}
