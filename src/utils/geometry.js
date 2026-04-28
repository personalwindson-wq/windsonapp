// Utilitários de geometria e visualização para a avaliação postural.

// Retorna cor baseada no valor vs limiares de aviso (w) e crítico (c).
function avCol(v, w, c) {
  return v < w ? '#D4AF37' : v < c ? '#F0A020' : '#ffb4ab';
}

// Retorna a severidade ('normal' | 'mild' | 'moderate') de uma métrica.
function avSev(m) {
  return m.value < m.warnAt ? 'normal' : m.value < m.critAt ? 'mild' : 'moderate';
}

// Desenha uma linha anotada no canvas entre dois keypoints.
function avDrawLine(ctx, p1, p2, label, color) {
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p1.x - 8, p1.y);
  ctx.lineTo(p2.x + 8, p1.y);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(label, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 8);
  ctx.textAlign = 'left';
}
window.avCol      = avCol;
window.avSev      = avSev;
window.avDrawLine = avDrawLine;
