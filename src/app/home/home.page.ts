import { ChangeDetectorRef, Component, ViewChildren, ElementRef, OnInit, QueryList } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { DataService, Note } from '../services/data.service';
import { ModalPage } from '../modal/modal.page';
import { AuthService } from '../services/auth.service';
import { AngularFireAuth, PERSISTENCE } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { User } from '../services/user';
import { Session } from '../services/session';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { docData, doc, Firestore } from '@angular/fire/firestore';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  
  notes: Note[] = [];
  sessions: Session[] = [];
  user: any;
  auth_user: any;
  userSub: any

  @ViewChildren("charts") lineCanvas: any;
  private lineChart: Chart[] = [];


  constructor(private firestore: Firestore, public afs: AngularFirestore, private dataService: DataService, private cd: ChangeDetectorRef, private alertCtrl: AlertController, private modalCtrl: ModalController,  public afAuth: AngularFireAuth, public authService: AuthService) {
    this.authStatusListener()  
    Chart.register(...registerables);
  }

  LoadGraphs(){ 
    this.lineCanvas.toArray().forEach((el,idx) => {
      let sessData = this.sessions[idx].data
      let labels = Array.from(Array(sessData.length).keys())
      this.lineChart.push(new Chart(el.nativeElement, {
        type:"line",
        data: {
          labels: labels,
          datasets: [{
          label: 'Air Flow (m/s)',
          data: sessData,
          fill: false,
          borderColor: 'rgb(80, 00, 00)',
          tension: 0.1
        }]}
      }))
    })
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
    this.dataService.getSessions(uid).subscribe((res) => {
      this.sessions = res;
      this.cd.detectChanges()
      this.LoadGraphs();
    })
  }


  GetUserData(user: any): Observable<User>{
    const userRef =  doc(this.firestore, `users/${user.uid}`);
    return docData(userRef, { idField: 'uid'}) as Observable<User>
  }

  async signOut(){
    this.userSub.unsubscribe()
    this.afAuth.signOut().then(() => {
    })
  }

  async addSession(){
    var dataArray: number[] = []
    for (let i = 0; i < 10; i++) {
      dataArray.push(Math.random())
    }

    var currentTime = new Date()
    this.dataService.addSession({uid: this.user.uid, date: currentTime, data: dataArray})

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
