import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../shared/navbar/navbar';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ref as dbRef, get, set } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

interface AppVersion {
  version: string;
  apk_url: string;
  uploadedAt: number;
}

@Component({
  selector: 'app-mobile-app',
  standalone: true,
  imports: [NavbarComponent, FormsModule, CommonModule, RouterLink],
  templateUrl: './mobile-app.html',
  styleUrls: ['./mobile-app.scss'],
  providers: [DatePipe]
})
export class MobileApp implements OnInit {

  role: string = 'SA';
  isLoggedIn: boolean = true;

  app: { apk_url: string; version: string } = { apk_url: '', version: '' };
  appHistory: AppVersion[] = [];

  newVersion: string = '';
  selectedFile: File | null = null;

  loading: boolean = false;
  uploadProgress: number = -1;

  logout() {
    console.log('User logged out');
  }

  ngOnInit() {
    this.fetchAppData();
  }

  fetchAppData() {
    const appRef = dbRef(db, 'app');
    get(appRef)
      .then(snapshot => {
        const data = snapshot.val();
        if (data) {
          this.app.apk_url = data.apk_url || '';
          this.app.version = data.version || '';
          this.appHistory = data.history || [];
        }
      })
      .catch(err => console.error('Error fetching app data:', err));
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  async uploadNewVersion() {
    if (!this.selectedFile || !this.newVersion) {
      alert('Please select an APK and enter the version number.');
      return;
    }

    this.loading = true;
    this.uploadProgress = 0;

    try {
      const apkStorageRef = storageRef(storage, `apps/${this.newVersion}.apk`);
      const uploadTask = uploadBytesResumable(apkStorageRef, this.selectedFile);

      uploadTask.on('state_changed', snapshot => {
        this.uploadProgress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      });

      await uploadTask;
      const apkUrl = await getDownloadURL(apkStorageRef);

      const timestamp = Date.now();
      const newEntry: AppVersion = {
        version: this.newVersion,
        apk_url: apkUrl,
        uploadedAt: timestamp
      };

      // Update current app info
      this.app.version = this.newVersion;
      this.app.apk_url = apkUrl;

      // Update history
      this.appHistory.unshift(newEntry);

      // Save updated data to Realtime Database
      await set(dbRef(db, 'app'), {
        apk_url: this.app.apk_url,
        version: this.app.version,
        history: this.appHistory
      });

      alert('New version uploaded successfully!');
      this.newVersion = '';
      this.selectedFile = null;

    } catch (err) {
      console.error('Error uploading APK:', err);
      alert('Failed to upload APK.');
    } finally {
      this.loading = false;
      this.uploadProgress = -1;
    }
  }
}
