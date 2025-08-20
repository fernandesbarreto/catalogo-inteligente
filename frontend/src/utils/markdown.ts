/**
 * Converts simple markdown formatting to HTML
 * Currently supports:
 * - **text** -> <strong>text</strong> (bold)
 * - *text* -> <em>text</em> (italic)
 */
export function parseMarkdown(text: string): string {
  if (!text) return text;

  // Convert **text** to <strong>text</strong>
  let result = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *text* to <em>text</em> (but not if it's already inside strong tags)
  result = result.replace(/(?<!<strong>.*)\*([^*]+)\*(?!.*<\/strong>)/g, '<em>$1</em>');
  
  // Convert line breaks to <br> tags
  result = result.replace(/\n/g, '<br>');
  
  return result;
}
