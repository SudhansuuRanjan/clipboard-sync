export const convertLinksToAnchor = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        let hyperlink = url.startsWith("www.") ? `https://${url}` : url;
        return `<a href="${hyperlink}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${url}</a>`;
    });
};