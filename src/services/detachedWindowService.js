/**
 * Serviço para gerenciar janelas destacadas no sistema operacional (Windows)
 * Utiliza Document Picture-in-Picture (Chromium/Electron) ou window.open como fallback.
 */

export function copyStylesToTarget(targetDoc, title = "VaultCast // Gamer's Vault") {
  if (!targetDoc || !targetDoc.head) return;
  
  try {
    targetDoc.title = title;

    // Clona todos os elementos de folha de estilo e links de fontes do documento principal
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      try {
        // Usa importNode para evitar DOMException entre documentos diferentes
        const importedNode = targetDoc.importNode(node, true);
        targetDoc.head.appendChild(importedNode);
      } catch (_) {
        // Fallback: recria a tag manualmente se importNode falhar
        try {
          if (node.tagName.toLowerCase() === 'style') {
            const style = targetDoc.createElement('style');
            style.textContent = node.textContent;
            targetDoc.head.appendChild(style);
          } else if (node.tagName.toLowerCase() === 'link' && node.href) {
            const link = targetDoc.createElement('link');
            link.rel = 'stylesheet';
            link.href = node.href;
            targetDoc.head.appendChild(link);
          }
        } catch (_) {}
      }
    });

    // Copia classes, atributos e variáveis CSS do tema ativo
    const mainDocEl = document.documentElement;
    const targetDocEl = targetDoc.documentElement;
    if (mainDocEl && targetDocEl) {
      targetDocEl.className = mainDocEl.className;
      targetDocEl.style.cssText = mainDocEl.style.cssText;
      targetDocEl.setAttribute('data-theme', mainDocEl.getAttribute('data-theme') || 'obsidian');
      targetDocEl.classList.add('dark');
    }

    // Configurações do corpo da janela destacada
    if (targetDoc.body) {
      targetDoc.body.style.margin = '0';
      targetDoc.body.style.padding = '0';
      targetDoc.body.style.backgroundColor = '#07090e';
      targetDoc.body.style.color = '#ffffff';
      targetDoc.body.style.overflow = 'hidden';
      targetDoc.body.style.fontFamily = "'Inter', system-ui, sans-serif";
      targetDoc.body.className = document.body?.className || 'bg-black text-white';
    }
  } catch (err) {
    console.warn('Erro não-fatal ao copiar estilos para a janela destacada:', err);
  }
}

export async function openDetachedLiveWindow({
  width = 560,
  height = 380,
  title = "VaultCast AO VIVO // Gamer's Vault"
} = {}) {
  let targetWin = null;

  // 1. Tenta Document Picture-in-Picture API (Chromium 116+ / Electron moderno)
  // Cria uma janela real no Windows com Always-on-Top e sem controles de navegador
  if (typeof window !== 'undefined' && 'documentPictureInPicture' in window && typeof window.documentPictureInPicture?.requestWindow === 'function') {
    try {
      targetWin = await window.documentPictureInPicture.requestWindow({
        width,
        height
      });
    } catch (err) {
      console.warn('Document Picture-in-Picture não aceito, tentando window.open:', err);
    }
  }

  // 2. Fallback para window.open nativo do Electron/Browser
  if (!targetWin && typeof window !== 'undefined') {
    try {
      const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
      targetWin = window.open(
        'about:blank',
        'VaultCast_Live_Detached',
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
      );
    } catch (err) {
      console.warn('Fallback window.open falhou:', err);
    }
  }

  if (targetWin) {
    try {
      copyStylesToTarget(targetWin.document, title);
    } catch (err) {
      console.warn('Erro ao configurar documento da janela destacada:', err);
    }
  }

  return targetWin;
}
