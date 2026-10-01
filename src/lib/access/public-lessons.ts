/** Keep interactive exercises out of public teaching fragments. */
export function publicLessonHtml(html: string): string {
  if (/<(?:input|textarea|select|button|audio|script)\b|\bdata-quiz\s*=/i.test(html)) {
    throw new Error('Public lesson contains interactive material. Move it into gated practice before publishing.');
  }
  return html;
}
