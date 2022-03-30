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
import { Chart, registerables, TooltipLabelStyle } from 'chart.js';

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
  userSub: any;

  modeSelected: string[] = [];


  @ViewChildren("charts") lineCanvas: any;
  private lineChart: Chart[] = [];


  constructor(private firestore: Firestore, public afs: AngularFirestore, private dataService: DataService, private cd: ChangeDetectorRef, private alertCtrl: AlertController, private modalCtrl: ModalController,  public afAuth: AngularFireAuth, public authService: AuthService) {
    this.authStatusListener()  
    Chart.register(...registerables);
  }

  LoadGraphs(){ 
    this.modeSelected = []
    this.lineCanvas.toArray().forEach((el,idx) => {
      this.modeSelected.push("airflow")
      let sessData = this.sessions[idx].data
      let labels = this.sessions[idx].indexes
      for(var i = 0, length = labels.length; i < length; ++i){
        labels[i] = labels[i] / 10
      }
      this.lineChart.push(new Chart(el.nativeElement, {
        type:"line",
        data: {
          labels: labels,
          datasets: [{
          label: 'Air Flow (m/s)',
          data: sessData,
          fill: false,
          borderColor: 'rgb(73, 138, 255)',
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

  async openAnalysis(graph_id, session){
    const modal = await this.modalCtrl.create({
      component: ModalPage,
      componentProps: { id: graph_id, session: session},
      breakpoints: [0, 0.5, 0.8],
      initialBreakpoint: 0.8

    })

    await modal.present();
  }

  airFlowClick(id){
    this.modeSelected[id] = "airflow"
    let sessData = this.sessions[id].data
    let labels = this.sessions[id].indexes

    this.lineChart[id].data.labels = labels
    this.lineChart[id].data.datasets = [{
      label: 'Air Flow (m/s)',
      data: sessData,
      fill: false,
      borderColor: 'rgb(73, 138, 255)',
      tension: 0.1
    }]

    this.lineChart[id].update()
  }

  tempClick(id){
    this.modeSelected[id] = "temp"

    let sessData = this.sessions[id].tempdata
    let labels = this.sessions[id].indexes

    this.lineChart[id].data.labels = labels
    this.lineChart[id].data.datasets = [{
      label: 'Temperature (C)',
      data: sessData,
      fill: false,
      borderColor: 'rgb(255, 166, 17)',
      tension: 0.1
    }]

    this.lineChart[id].update()
  }

  async analysisClick(id){
    await this.dataService.getBreathingById(this.sessions[id].sessionID).subscribe((res) => {
      if(res.length == 0){
        this.openAnalysis(id, this.sessions[id]).then(res => {
          console.log("dataLoaded")
        })
      }
      else{
        this.modeSelected[id] = "analysis"

        let sessData = res[0].data
        let labels = Array.from(Array(sessData.length).keys())
        for(var i = 0, length = labels.length; i < length; ++i){
          labels[i] = labels[i] * 12.4
        }

        this.lineChart[id].data.labels = labels
        this.lineChart[id].data.datasets = [{
          label: 'Breathing Rate',
          data: sessData,
          fill: false,
          borderColor: 'rgb(255, 203, 43)',
          tension: 0.1
        }]

        this.lineChart[id].update()
      }
    })
  }

}
