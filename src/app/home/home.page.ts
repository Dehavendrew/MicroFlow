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
import { MLService } from '../services/ml.service';
import { ToastController } from '@ionic/angular';

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
  @ViewChildren("nobs") nobList: any;
  private lineChart: Chart[] = [];


  constructor(private toastCtrl: ToastController, private mlService: MLService, private firestore: Firestore, public afs: AngularFirestore, private dataService: DataService, private cd: ChangeDetectorRef, private alertCtrl: AlertController, private modalCtrl: ModalController,  public afAuth: AngularFireAuth, public authService: AuthService) {
    this.authStatusListener()  
    Chart.register(...registerables);
  }

  LoadGraphs(){ 
    this.modeSelected = []
    this.lineChart = []
    this.lineCanvas.toArray().forEach((el,idx) => {
      this.modeSelected.push("airflow")
      let sessData = this.sessions[idx].data
      let labels = this.sessions[idx].indexes
      this.nobList.toArray()[idx].value = this.sessions[idx].numSamples 
      this.nobList.toArray()[idx].color = 'blue'
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
      this.modeSelected = []
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
    this.nobList.toArray()[id].color = 'blue'
    if(this.nobList.toArray()[id].value.lower && this.nobList.toArray()[id].value.upper){
      this.updateTimeAxis(this.nobList.toArray()[id].value.lower, this.nobList.toArray()[id].value.upper, id)
    }
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
    this.nobList.toArray()[id].color = 'orange'
    if(this.nobList.toArray()[id].value.lower && this.nobList.toArray()[id].value.upper){
      this.updateTimeAxis(this.nobList.toArray()[id].value.lower, this.nobList.toArray()[id].value.upper, id)
    }
  }

  plotAnalysis(ress, id, low=0, high=-1){
    if(ress){
      this.modeSelected[id] = "analysis"
  
      let brData = ress.data
      let selectedIndexes = []
      let selectedData = []
      if(high != -1){
        for(let i = 0; i < brData.length; ++i){
          if(i * 12.4 > low && i * 12.4 < high){
            selectedIndexes.push(i * 12.4)
            selectedData.push(brData[i])
          }
        }
      }
      else{
        selectedData = brData
        selectedIndexes = Array.from(Array(brData.length).keys())
        for(let i = 0; i < brData.length; ++i){
          selectedIndexes[i] = selectedIndexes[i] * 12.4
        }
      }

      if(selectedData.length > 20){
        let sumarizedData = []
        let sumarizedIndexes = []

        for(let i = 0; i < 20; ++i){
          sumarizedData.push(selectedData[i *Math.floor(selectedData.length / 20)])
          sumarizedIndexes.push(selectedIndexes[i *Math.floor(selectedData.length / 20)])
        }
        selectedData = sumarizedData
        selectedIndexes = sumarizedIndexes
      }
  
      this.lineChart[id].data.labels = selectedIndexes
      this.lineChart[id].data.datasets = [{
        label: 'Breathing Rate (Per Minute)',
        data: selectedData,
        fill: false,
        borderColor: 'rgb(255, 203, 43)',
        tension: 0.1
      }]
  
      this.lineChart[id].update()
      this.nobList.toArray()[id].color = 'yellow'
    }
  }

  async analysisClick(id){
    await this.dataService.getBreathingById(this.sessions[id].sessionID).subscribe((res) => {
      if(res.length == 0){
        this.mlService.analyizeData(this.sessions[id]).then((br) => {
          if(this.nobList.toArray()[id].value.upper){
            this.plotAnalysis(br, id,this.nobList.toArray()[id].value.lower, this.nobList.toArray()[id].value.upper)
          }
          else{
            this.plotAnalysis(br, id)
          }
        })
        
      }
      else{
        if(this.nobList.toArray()[id].value.upper){
          this.plotAnalysis(res[0], id,this.nobList.toArray()[id].value.lower, this.nobList.toArray()[id].value.upper)
        }
        else{
          this.plotAnalysis(res[0], id)
        }
      }
    })
  }

  async updateTimeAxis(low, high, idx){
    let data = []
    let numPoints = 20

    let indexes = []
    for(let i = 0; i < numPoints; ++i){
      indexes.push(low + Math.floor(i * (high - low) / 20))
    }


    if(this.modeSelected[idx] != "analysis"){
      await this.dataService.getPacketsForSession(this.sessions[idx].sessionID).subscribe((res) => {
        for(let i = 0; i < numPoints; ++i){
          if(this.modeSelected[idx] == "temp"){
            data.push(res[Math.floor(indexes[i] / 125)].data[125 + indexes[i] % 125])
          }
          else{
            data.push(res[Math.floor(indexes[i] / 125)].data[indexes[i] % 125])
          }
        }
  
  
        this.lineChart[idx].data.labels = indexes
        if(this.modeSelected[idx] != "temp"){
          this.lineChart[idx].data.datasets = [{
            label: 'Air Flow (m/s)',
            data: data,
            fill: false,
            borderColor: 'rgb(73, 138, 255)',
            tension: 0.1
          }]
        }
        else{
          this.lineChart[idx].data.datasets = [{
            label: 'Temperature (C)',
            data: data,
            fill: false,
            borderColor: 'rgb(255, 166, 17)',
            tension: 0.1
          }]
        }
  
        this.lineChart[idx].update()
      })
    }
    else{
      await this.dataService.getBreathingById(this.sessions[idx].sessionID).subscribe((res) => {
        if(res.length == 0){
          this.mlService.analyizeData(this.sessions[idx]).then((br) => {
            this.plotAnalysis(br, idx, low, high)
          })
          
        }
        else{
          this.plotAnalysis(res[0], idx, low, high)
        }
      })
    }
  }

  async onChange(event, idx){
    this.updateTimeAxis(event.target.value.lower,event.target.value.upper, idx)
  }

}
