
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        formation: 'formation.html',
        experience: 'experience.html',
        projets: 'projets.html',
        artistique: 'artistique.html',
        contact: 'contact.html'
      }
    }
  }
});
