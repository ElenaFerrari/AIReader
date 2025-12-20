
export interface ChunkResult {
  chunks: string[];
  chapterIndices: number[];
}

const isChapterHeading = (el: Element): boolean => {
  const text = el.textContent?.trim() || "";
  if (text.length === 0 || text.length > 120) return false;

  const tagName = el.tagName.toUpperCase();
  if (['H1', 'H2', 'H3', 'H4'].includes(tagName)) return true;

  // Regex flessibile per: "Capitolo 2", "Cap. II", "2. Il ritorno", "Parte prima", "II - Titolo"
  const chapterPatterns = [
    /^(capitolo|cap\.|parte|libro|prologo|epilogo|sezione)\s+([ivxlcdm\d]+|[a-z]+)/i,
    /^\d+[\.\s\-]+[A-Z]/, // Esempio: "2. Titolo"
    /^[IVXLCDM]+[\.\s\-]+[A-Z]/, // Esempio: "II. Titolo"
    /^\d+$/ // Solo numero (spesso usato nei libri come separatore capitolo)
  ];

  return chapterPatterns.some(regex => regex.test(text));
};

export const chunkText = (html: string): ChunkResult => {
  const chapterIndices: number[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const elements = Array.from(doc.querySelectorAll('p, div, h1, h2, h3, h4, blockquote, section, li, center'));
  
  if (elements.length === 0) {
    const lines = html.split(/\n+/).filter(p => p.trim().length > 0);
    lines.forEach((line, idx) => {
      if (/^(capitolo|parte|libro|prologo|\d+[\.\s]|[IVXLCDM]+[\.\s])/i.test(line.trim())) chapterIndices.push(idx);
    });
    return { chunks: lines, chapterIndices };
  }

  const chunks: string[] = [];
  let currentChunk = "";
  const MAX_CHUNK_LENGTH = 1100;

  elements.forEach((el) => {
    const isHeading = isChapterHeading(el);
    const elHTML = el.outerHTML;

    if (isHeading) {
      if (currentChunk.trim() !== "") {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      chapterIndices.push(chunks.length);
    }

    if ((currentChunk + elHTML).length > MAX_CHUNK_LENGTH && currentChunk !== "" && !isHeading) {
      chunks.push(currentChunk);
      currentChunk = elHTML;
    } else {
      currentChunk += elHTML;
    }
  });

  if (currentChunk.trim()) chunks.push(currentChunk);
  
  return { chunks, chapterIndices };
};

export const parseFile = async (file: File): Promise<{ title: string; content: string }> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'txt') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ title: file.name.replace('.txt', ''), content: e.target?.result as string });
      reader.onerror = reject;
      reader.readAsText(file);
    });
  } 
  
  else if (extension === 'docx') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          // @ts-ignore
          const mammothLib = window.mammoth || (window as any).mammoth;
          const result = await mammothLib.convertToHtml({ arrayBuffer });
          resolve({ title: file.name.replace('.docx', ''), content: result.value });
        } catch (err) { reject(new Error("Errore Docx.")); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  else if (extension === 'epub') {
    return new Promise(async (resolve, reject) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        // @ts-ignore
        const book = ePub(arrayBuffer);
        await book.ready;
        const metadata = await book.loaded.metadata;
        const title = metadata.title || file.name.replace('.epub', '');
        let fullHTML = '';
        // @ts-ignore
        const spineItems = book.spine.items;
        for (const item of spineItems) {
          try {
            const section = book.spine.get(item.index);
            if (section) {
              // @ts-ignore
              const doc = await section.load(book.load.bind(book));
              const body = doc.body || doc.querySelector('body');
              if (body) fullHTML += body.innerHTML;
            }
          } catch (e) {}
        }
        resolve({ title, content: fullHTML });
      } catch (err) { reject(new Error("Errore ePub.")); }
    });
  }

  throw new Error(`Formato .${extension} non supportato.`);
};
