window.PawIDAPI = {
  async analyze(files, meta = {}) {
    const body = new FormData();
    files.slice(0, 3).forEach((file) => body.append('photos', file));
    body.append('species', meta.species || '猫');
    body.append('name', meta.name || '');

    const response = await fetch('./api/analyze', {
      method: 'POST',
      body
    });

    if (!response.ok) {
      throw new Error(`AI service unavailable (${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data.breeds) || !data.traits) {
      throw new Error('Invalid AI response');
    }
    return data;
  }
};
