const fs = require('fs');
const path = require('path');
const vm = require('vm');

const aiHaberPath = path.join(__dirname, '..', 'workflows', '03-content-creation', 'ai-haber-blog-otomasyonu.json');
const yenidenTasarlaPath = path.join(__dirname, '..', 'workflows', '03-content-creation', 'mevcut-yazilari-yeniden-tasarla.json');

console.log('--- 1. WORKFLOW JSON VALIDATION ---');
const aiHaber = JSON.parse(fs.readFileSync(aiHaberPath, 'utf8'));
const yeniden = JSON.parse(fs.readFileSync(yenidenTasarlaPath, 'utf8'));
console.log('ai-haber-blog-otomasyonu.json parsed successfully. Node count:', aiHaber.nodes.length);
console.log('mevcut-yazilari-yeniden-tasarla.json parsed successfully. Node count:', yeniden.nodes.length);

console.log('\n--- 2. JS CODE EXECUTION SIMULATION FOR ai-haber-blog-otomasyonu ---');

function createMockN8nContext(overrides = {}) {
  const staticData = { yayinlananlar: {}, basladi: null, kullanilanGorseller: [] };
  const mockNodes = {
    'Ayarlar': [{ json: { blogId: '4354035407776294026', gunlukYaziSayisi: 10, kacSaatGeriye: 28, yazilarArasiSaniye: 45 } }],
    'Haber Kaynaklari': [
      { json: { kaynak: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' } },
      { json: { kaynak: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' } }
    ],
    'Tek Tek Isle': [{ json: {
      baslik: 'OpenAI Yeni Nesil Modeli Duyurdu',
      link: 'https://techcrunch.com/2026/08/21/sample-ai-news/',
      kaynak: 'TechCrunch AI',
      anahtar: 'openai yeni nesil modeli duyurdu',
      ozet: 'OpenAI yeni akıl yürütme mimarisini duyurdu. Model benchmarklarda rekor kırdı.'
    }}],
    'Yaziyi Hazirla': [{ json: {
      blogId: '4354035407776294026',
      anahtar: 'openai yeni nesil modeli duyurdu',
      atla: false,
      atlamaNedeni: '',
      baslikTaslak: 'OpenAI Yeni Nesil Modeli Duyurdu',
      postBody: {
        kind: 'blogger#post',
        title: 'OpenAI Yeni Nesil Modeli Duyurdu',
        content: '<p>OpenAI yeni akıl yürütme mimarisini resmi olarak duyurdu.</p><h3>1. Arka Plan ve Gelişmeler</h3><p>Gelişme sektörde geniş yankı buldu. Halüsinasyon oranları ciddi ölçüde düştü.</p><h3>2. Teknik Mimari</h3><p>Yeni model çok adımlı doğrulama zincirleri kullanıyor.</p><ul><li>%40 daha hızlı</li><li>2M token bağlam penceresi</li></ul><blockquote>Bu gelişme yapay zekada bir kırılma noktasıdır.</blockquote><p>Türkiye açısından da yerli girişimlere rekabet gücü sağlayacak.</p>',
        labels: ['Yapay Zeka', 'Derinlemesine Analiz', 'TechCrunch AI', 'Teknoloji Raporu']
      }
    }}],
    'Gorsel ve Tipografi': [{ json: {
      blogId: '4354035407776294026',
      anahtar: 'openai yeni nesil modeli duyurdu',
      atla: false,
      postBody: {
        title: 'OpenAI Yeni Nesil Modeli Duyurdu',
        content: '<p>Test içerik</p>'
      }
    }}],
    'Icerik Coz': [{ json: {
      atla: false,
      postId: '1001',
      blogId: '4354035407776294026',
      haberKaynak: 'TechCrunch AI',
      haberLink: 'https://techcrunch.com/test',
      gorsel_sorgu: 'artificial intelligence',
      gorsel_genel: 'artificial intelligence'
    }}],
    'Wikimedia Ara': [{ json: { query: { pages: {} } } }],
    'Openverse Yedek': [{ json: { results: [{ url: 'https://example.com/ov.jpg', title: 'AI', creator: 'Author', license: 'cc0', source: 'openverse' }] } }]
  };

  const context = {
    $getWorkflowStaticData: (type) => staticData,
    $: (nodeName) => ({
      first: () => (mockNodes[nodeName] ? mockNodes[nodeName][0] : { json: {} }),
      all: () => (mockNodes[nodeName] || [])
    }),
    $input: {
      first: () => overrides.$inputFirst || { json: {} },
      all: () => overrides.$inputAll || []
    },
    $json: overrides.$json || {},
    console,
    Date,
    Math,
    String,
    Array,
    Object,
    JSON,
    Set,
    Map,
    RegExp,
    encodeURIComponent,
    Boolean
  };

  return { context, staticData, mockNodes };
}

// Test Code nodes in aiHaber
for (const node of aiHaber.nodes) {
  if (node.type === 'n8n-nodes-base.code') {
    console.log(`Testing Code Node: [${node.name}]`);
    const code = node.parameters.jsCode;
    
    let testOverrides = {};
    if (node.name === 'Kosu Kilidi') {
      testOverrides = {};
    } else if (node.name === 'Haber Kaynaklari') {
      testOverrides = {};
    } else if (node.name === 'Sec ve Siralama') {
      testOverrides = {
        $inputAll: [
          { json: { title: 'Test AI Haber 1', link: 'https://example.com/1', isoDate: new Date().toISOString(), contentSnippet: 'Test ozet 1' }, pairedItem: 0 },
          { json: { title: 'Test AI Haber 2', link: 'https://example.com/2', isoDate: new Date().toISOString(), contentSnippet: 'Test ozet 2' }, pairedItem: 1 }
        ]
      };
    } else if (node.name === 'Yaziyi Hazirla') {
      const mockGeminiJson = JSON.stringify({
        baslik: 'OpenAI Yeni Nesil Modeli Duyurdu',
        html: '<p>İlk giriş paragrafı detaylı anlatım.</p><h3>1. Arka Plan</h3><p>İkinci paragraf detaylı anlatım burada yer alıyor.</p><h3>2. Mimari</h3><p>Üçüncü paragraf mimari açıklaması.</p><p>Dördüncü paragraf Türkiye perspektifi ve sonuçlar.</p>'
      });
      testOverrides = {
        $inputFirst: { json: { candidates: [{ content: { parts: [{ text: mockGeminiJson }] } }] } }
      };
    } else if (node.name === 'Gorsel ve Tipografi') {
      testOverrides = {
        $inputFirst: { json: { data: '<html><head><meta property="og:image" content="https://example.com/image.jpg"></head></html>' } }
      };
    } else if (node.name === 'Mukerrer Karari') {
      testOverrides = {
        $inputFirst: { json: { items: [] } }
      };
    } else if (node.name === 'Basariyi Kaydet') {
      testOverrides = {
        $inputFirst: { json: { id: '123456789', kind: 'blogger#post', url: 'https://blog.example.com/post' } }
      };
    } else if (node.name === 'Gunluk Ozet') {
      testOverrides = {
        $inputAll: [{ json: { basarili: true, yayinBasligi: 'Test Baslik' } }]
      };
    }

    const { context } = createMockN8nContext(testOverrides);
    try {
      const script = new vm.Script(`(function() { ${code} })()`);
      const result = script.runInNewContext(context);
      console.log(`  -> OK! Result count: ${Array.isArray(result) ? result.length : typeof result}`);
      if (node.name === 'Gorsel ve Tipografi') {
        const item = result[0].json;
        console.log(`  -> Gorsel ve Tipografi check: atla=${item.atla}, gorselUrl=${item.gorselUrl}, hasPostBody=${!!item.postBody}`);
        if (item.atla) {
          console.error('  -> ERROR in Gorsel ve Tipografi: atla is true!', item.atlamaNedeni);
          process.exit(1);
        }
      }
    } catch (err) {
      console.error(`  -> ERROR executing [${node.name}]:`, err);
      process.exit(1);
    }
  }
}

console.log('\n--- 3. JS CODE EXECUTION SIMULATION FOR mevcut-yazilari-yeniden-tasarla ---');
for (const node of yeniden.nodes) {
  if (node.type === 'n8n-nodes-base.code') {
    console.log(`Testing Code Node: [${node.name}]`);
    const code = node.parameters.jsCode;
    
    let testOverrides = {};
    if (node.name === 'Yazilari Ayikla') {
      testOverrides = {
        $json: {
          items: [
            { id: '1001', title: 'Eski Post Başlığı', content: '<p>Eski post içeriği yapay zeka haberi hakkında.</p>Kaynak: <a href="https://techcrunch.com/test">TechCrunch AI</a>' }
          ]
        }
      };
    } else if (node.name === 'Gemini Istek') {
      testOverrides = {
        $json: {
          postId: '1001',
          eskiBaslik: 'Eski Post Başlığı',
          eskiMetin: 'Eski post metni.'
        }
      };
    } else if (node.name === 'Icerik Coz') {
      const mockCozJson = JSON.stringify({
        baslik: 'Yeniden Tasarlanan Başlık',
        ozet: 'Bu bir alt başlıktır ve uzun formatlı içerik özetini temsil eder.',
        bolumler: [
          { h3: 'Giriş ve Arka Plan', html: '<p>Detaylı açıklama.</p>' },
          { h3: 'Teknik Mimari', html: '<p>Mimari detaylar.</p>' },
          { h3: 'Sonuçlar', html: '<p>Sonuç detayları.</p>' }
        ],
        onemli_noktalar: ['%50 daha hızlı', '10 kat kapasite', 'Sıfır hata'],
        turkiye_acisi: 'Türkiye açısından önemli fırsatlar barındırıyor.',
        one_cikan_alinti: 'Yapay zekada yeni bir dönem başlıyor.',
        gorsel_sorgu: 'artificial intelligence laboratory'
      });
      testOverrides = {
        $json: {
          candidates: [{
            content: {
              parts: [{
                text: mockCozJson
              }]
            }
          }]
        }
      };
    } else if (node.name === 'Gorsel Sec') {
      testOverrides = {};
    } else if (node.name === 'Yaziyi Hazirla') {
      testOverrides = {
        $json: {
          atla: false,
          postId: '1001',
          blogId: '4354035407776294026',
          haberKaynak: 'TechCrunch AI',
          haberLink: 'https://techcrunch.com/test',
          gorsel: { url: 'https://example.com/wm.jpg', title: 'AI görsel', source: 'Wikimedia' },
          icerik: {
            baslik: 'Yeniden Tasarlanan Başlık',
            ozet: 'Bu bir alt başlıktır ve uzun formatlı içerik özetini temsil eder.',
            bolumler: [
              { h3: 'Giriş ve Arka Plan', html: '<p>Detaylı açıklama.</p>' },
              { h3: 'Teknik Mimari', html: '<p>Mimari detaylar.</p>' },
              { h3: 'Sonuçlar', html: '<p>Sonuç detayları.</p>' }
            ],
            onemli_noktalar: ['%50 daha hızlı', '10 kat kapasite', 'Sıfır hata'],
            turkiye_acisi: 'Türkiye açısından önemli fırsatlar barındırıyor.',
            one_cikan_alinti: 'Yapay zekada yeni bir dönem başlıyor.'
          }
        }
      };
    } else if (node.name === 'Basariyi Kaydet') {
      testOverrides = {
        $json: { id: '1001', kind: 'blogger#post' }
      };
    } else if (node.name === 'Ozet') {
      testOverrides = {
        $inputAll: [{ json: { basarili: true, yeniBaslik: 'Test' } }]
      };
    }

    const { context } = createMockN8nContext(testOverrides);
    try {
      const script = new vm.Script(`(function() { ${code} })()`);
      const result = script.runInNewContext(context);
      console.log(`  -> OK! Result count: ${Array.isArray(result) ? result.length : typeof result}`);
    } catch (err) {
      console.error(`  -> ERROR executing [${node.name}]:`, err);
      process.exit(1);
    }
  }
}

console.log('\n--- ALL TEST CHECKS PASSED WITH ZERO ERRORS! ---');
