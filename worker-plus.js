export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    const type = response.headers.get('content-type') || '';
    if ((url.pathname === '/' || url.pathname.endsWith('.html')) && type.includes('text/html')) {
      return new HTMLRewriter()
        .on('body', {
          element(element) {
            element.append('<script src="/plus-options.js"></script>', { html: true });
          }
        })
        .transform(response);
    }
    return response;
  }
};