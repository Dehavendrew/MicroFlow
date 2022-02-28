import { ChangeDetectorRef, Component } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { DataService, Note } from '../services/data.service';
import { ModalPage } from '../modal/modal.page';
import { getAuth } from '@angular/fire/auth'
import { AuthService } from '../services/auth.service';
import { AngularFireAuth, PERSISTENCE } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { User } from '../services/user';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { docData, doc, Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  
  notes: Note[] = [];
  user: any;
  auth_user: any;
  userSub: any


  constructor(private firestore: Firestore, public afs: AngularFirestore, private dataService: DataService, private cd: ChangeDetectorRef, private alertCtrl: AlertController, private modalCtrl: ModalController,  public afAuth: AngularFireAuth, public authService: AuthService) {
    this.authStatusListener()
  }

  authStatusListener(){
    this.afAuth.onAuthStateChanged((cred) => {
      if(cred){
        this.setUser(cred)
        this.setData(cred.uid)
      }
      else{
        this.user = null
      }
    })
  }

  setUser(user){
    this.userSub = this.GetUserData(user).subscribe(
      user1 => {
        this.user = user1
      }
    )
  }

  setData(uid){
    this.dataService.getNotes(uid).subscribe((res) => {
      this.notes = res;
      this.cd.detectChanges()
    })
  }

  GetUserData(user: any): Observable<User>{
    const userRef =  doc(this.firestore, `users/${user.uid}`);
    return docData(userRef, { idField: 'uid'}) as Observable<User>
  }

  // setUser(){
  //   this.userSub = this.afAuth.authState.subscribe(res => {
  //     console.log("New Sign in Detected")
  //     this.cd.detectChanges();
  //     this.authService.GetUserData(res).subscribe(
  //       user => {
  //         this.user = user
  //         this.dataService.getNotes(this.user.uid).subscribe(res => {
  //           this.notes = res;
  //           this.cd.detectChanges()
  //         })
  //       },
  //       err => console.log(err));
  //   }, err => {console.log("Not Signed In")})
  // }

  async signOut(){
    this.userSub.unsubscribe()
    this.afAuth.signOut().then(() => {
    })
  }

  async addNote(){
    const alert = await this.alertCtrl.create({
      header: 'Add Note',
      inputs: [
        {
          name: 'title',
          placeholder: 'Test Note',
          type: 'text'
        },
        {
          name: 'text',
          placeholder: 'Test Note Content',
          type: 'textarea'
        }
      ],
      buttons:[
        {
          text: 'Cancel',
          role: 'cancel'
        },{
          text: 'Add',
          handler: res =>{
            this.dataService.addNote({text: res.text, title: res.title, uid: this.user.uid})
          }
        }
      ]
    });

    await alert.present();
  }

  async openNote(note: Note){
    const modal = await this.modalCtrl.create({
      component: ModalPage,
      componentProps: { id: note.id},
      breakpoints: [0, 0.5, 0.8],
      initialBreakpoint: 0.8

    })

    await modal.present();
  }

}
