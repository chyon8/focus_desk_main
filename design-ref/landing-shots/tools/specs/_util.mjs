// Place widgets by where they should land on the 1440×900 screen.
// The canvas starts right of the rail (88px); screenX = 88 + (worldX - cam.x) * zoom.
export const RAIL = 88;

export function screen(zoom, cam = { x: 0, y: 0 }) {
  return (sx, sy, sw, sh) => ({
    x: Math.round((sx - RAIL) / zoom + cam.x),
    y: Math.round(sy / zoom + cam.y),
    w: Math.round(sw / zoom),
    h: Math.round(sh / zoom),
  });
}

export const checklist = (items) =>
  `<ul data-type="taskList">${items
    .map(
      ([text, done]) =>
        `<li data-type="taskItem" data-checked="${done ? 'true' : 'false'}"><label><input type="checkbox"${
          done ? ' checked="checked"' : ''
        }><span></span></label><div><p>${text}</p></div></li>`
    )
    .join('')}</ul>`;

export const table = (rows) =>
  `<table><tbody>${rows
    .map(
      (row, i) =>
        `<tr>${row.map((cell) => (i === 0 ? `<th><p>${cell}</p></th>` : `<td><p>${cell}</p></td>`)).join('')}</tr>`
    )
    .join('')}</tbody></table>`;

export const todos = (items) =>
  items.map(([text, done], i) => ({ id: `t${i}`, text, done: !!done }));
