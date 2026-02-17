{/* SEO Settings */}
<div className="bg-gray-800 rounded-lg p-6 space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-semibold text-white">SEO настройки</h3>
    <button
      type="button"
      onClick={generateSeoFromContent}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
    >
      🪄 Заполнить автоматически
    </button>
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1">Meta Title</label>
    <input
      type="text"
      value={formData.seoTitle || ''}
      onChange={(e) => setFormData({...formData, seoTitle: e.target.value})}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
      placeholder="SEO заголовок"
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1">Meta Description</label>
    <textarea
      value={formData.seoDescription || ''}
      onChange={(e) => setFormData({...formData, seoDescription: e.target.value})}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
      placeholder="SEO описание"
      rows={3}
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1">Meta Keywords</label>
    <input
      type="text"
      value={formData.seoKeywords || ''}
      onChange={(e) => setFormData({...formData, seoKeywords: e.target.value})}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
      placeholder="Ключевые слова через запятую"
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1">OG Image URL</label>
    <input
      type="text"
      value={formData.ogImageUrl || ''}
      onChange={(e) => setFormData({...formData, ogImageUrl: e.target.value})}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
      placeholder="URL изображения для соцсетей"
    />
  </div>
</div>
const generateSeoFromContent = () => {
  const title = formData.title || '';
  const summary = formData.summary || '';
  const tools = formData.tools || [];
  
  const seoTitle = title ? `${title} | Кейс Prime Coder` : '';
  const seoDescription = summary || '';
  const keywords = [...tools, 'кейс', 'разработка сайта', 'веб-разработка'].join(', ');
  const ogImageUrl = formData.heroImageUrl || formData.contentJson?.hero?.backgroundImage || '';
  
  setFormData({
    ...formData,
    seoTitle,
    seoDescription,
    seoKeywords: keywords,
    ogImageUrl
  });
};
