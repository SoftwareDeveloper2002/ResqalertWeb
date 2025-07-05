import { bootstrapApplication } from '@angular/platform-browser';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    provideHttpClient(), // ✅ Already included
    ...appConfig.providers || [],
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideDatabase(() => getDatabase())
  ]
}).catch((err) => console.error(err));
