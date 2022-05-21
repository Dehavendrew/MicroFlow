import { ChangeDetectorRef, Component, ViewChildren, ElementRef, OnInit, QueryList } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { DataService, Note } from '../services/data.service';
import { ModalPage } from '../modal/modal.page';
import { AuthService } from '../services/auth.service';
import { AngularFireAuth, PERSISTENCE } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { User } from '../services/user';
import { Session, Event } from '../services/session';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { docData, doc, Firestore } from '@angular/fire/firestore';
import { Chart, registerables, TooltipLabelStyle } from 'chart.js';
import { MLService } from '../services/ml.service';
import { ToastController } from '@ionic/angular';
import {Platform} from '@ionic/angular';

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
  eventsPerSession: Event[][] = [];
  eventsDroppedDown:boolean[] = [];
  incrementSizes: number[] = [];

  platForm: string;


  @ViewChildren("charts") lineCanvas: any;
  @ViewChildren("nobs") nobList: any;
  private lineChart: Chart[] = [];


  constructor(private platform: Platform, private toastCtrl: ToastController, private mlService: MLService, private firestore: Firestore, public afs: AngularFirestore, private dataService: DataService, private cd: ChangeDetectorRef, private alertCtrl: AlertController, private modalCtrl: ModalController,  public afAuth: AngularFireAuth, public authService: AuthService) {
    this.authStatusListener()  
    Chart.register(...registerables);

    platform.ready().then(() => {

      console.log(this.platform.is)

      if (this.platform.is('mobileweb')) {
          console.log("running in a browser on mobile!");
          this.platForm = "web"
      }

    });
  }

  LoadGraphs(){ 
    this.modeSelected = []
    this.lineChart = []
    this.eventsPerSession = []
    this.eventsDroppedDown = []
    this.incrementSizes = []
    this.lineCanvas.toArray().forEach((el,idx) => {
      this.modeSelected.push("airflow")
      this.eventsDroppedDown.push(false)
      this.eventsPerSession.push([])
      this.incrementSizes.push(0.1)
      this.loadEvents(idx)
      let sessData = this.sessions[idx].data
      let labels = this.sessions[idx].indexes
      this.nobList.toArray()[idx].value = this.sessions[idx].numSamples 
      this.nobList.toArray()[idx].color = 'blue'
      for(var i = 0, length = labels.length; i < length; ++i){
        labels[i] = labels[i] / 10
      }
      this.lineChart.push(new Chart(el.nativeElement, {
        type:"line",
        options:{
          animation:{
            duration: 0.5
          }
        },
        data: {
          labels: labels,
          datasets: [{
          label: 'Air Flow (m/s)',
          data: sessData,
          fill: false,
          borderColor: 'rgb(97, 18, 36)',
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
      this.eventsPerSession = []
      this.eventsDroppedDown = []
      this.incrementSizes = []
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
      borderColor: 'rgb(97, 18, 36)',
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
      borderColor: 'rgb(128,128,128)',
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
          if((i * 12.4) > (low / 10) && (i * 12.4) < (high / 10)){
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
          sumarizedIndexes.push(Math.round(selectedIndexes[i *Math.floor(selectedData.length / 20)]))
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
  updateEvents(events, idx){
    const sorter = (a, b) => {
      return a.timeStamp < b.timeStamp ? -1 : 1
    }

    this.eventsPerSession[idx] = []
    if(events){
      events.localOutliers.forEach(val => {
        this.eventsPerSession[idx].push({eventType:"Local Extreme",timeStamp:Math.round(val / 10 * 100) / 10})
      })
      events.localShocks.forEach(val => {
        this.eventsPerSession[idx].push({eventType:"Local Shock",timeStamp:Math.round(val / 10 * 100) / 10})
      })
    }

    this.eventsPerSession[idx] = this.eventsPerSession[idx].sort(sorter)
  }

  changeIncrement(idx){
    if(this.incrementSizes[idx] == 1000){
      this.incrementSizes[idx] = 0.1
    }
    else{
      this.incrementSizes[idx]= this.incrementSizes[idx] * 10
    }
  }

  plotAnomaly(time, idx){
    this.nobList.toArray()[idx].value = {"lower":time-1,"upper":time+1} 
  }

  plotNudgeLeft(idx){
    if(this.nobList.toArray()[idx].value.lower && this.nobList.toArray()[idx].value.lower > 0 + this.incrementSizes[idx]){
      this.nobList.toArray()[idx].value = {"lower":this.nobList.toArray()[idx].value.lower-this.incrementSizes[idx],"upper":this.nobList.toArray()[idx].value.upper - this.incrementSizes[idx]}
    }
  }

  plotNudgeRight(idx){
    if(this.nobList.toArray()[idx].value.upper && this.nobList.toArray()[idx].value.upper < this.sessions[idx].numSamples - this.incrementSizes[idx]){
      this.nobList.toArray()[idx].value = {"lower":this.nobList.toArray()[idx].value.lower+this.incrementSizes[idx],"upper":this.nobList.toArray()[idx].value.upper + this.incrementSizes[idx]}
    }
  }

  plotLeftNudgeLeft(idx){
    if(this.nobList.toArray()[idx].value.lower && this.nobList.toArray()[idx].value.lower > 0 + this.incrementSizes[idx]){
      this.nobList.toArray()[idx].value = {"lower":this.nobList.toArray()[idx].value.lower-this.incrementSizes[idx],"upper":this.nobList.toArray()[idx].value.upper}
    }
  }

  plotRightNudgeRight(idx){
    if(this.nobList.toArray()[idx].value.upper && this.nobList.toArray()[idx].value.upper < this.sessions[idx].numSamples - this.incrementSizes[idx]){
      this.nobList.toArray()[idx].value = {"lower":this.nobList.toArray()[idx].value.lower,"upper":this.nobList.toArray()[idx].value.upper + this.incrementSizes[idx]}
    }
  }

  plotLeftNudgeRight(idx){
    if(this.nobList.toArray()[idx].value.lower && this.nobList.toArray()[idx].value.lower > 0 + this.incrementSizes[idx]){
      this.nobList.toArray()[idx].value = {"lower":this.nobList.toArray()[idx].value.lower + this.incrementSizes[idx],"upper":this.nobList.toArray()[idx].value.upper}
    }
  }

  plotRightNudgeLeft(idx){
    if(this.nobList.toArray()[idx].value.upper && this.nobList.toArray()[idx].value.upper < this.sessions[idx].numSamples - this.incrementSizes[idx]){
      this.nobList.toArray()[idx].value = {"lower":this.nobList.toArray()[idx].value.lower,"upper":this.nobList.toArray()[idx].value.upper - this.incrementSizes[idx]}
    }
  }

  async loadEvents(id){
    await this.dataService.getBreathingById(this.sessions[id].sessionID).subscribe((res) => {
      if(res.length != 0){
        this.updateEvents(res[0], id)
      }
    })
  }

  async analysisClick(id){
    if(this.nobList.toArray()[id] && this.sessions[id]){
      await this.dataService.getBreathingById(this.sessions[id].sessionID).subscribe((res) => {
        if(res.length == 0){
          this.mlService.analyizeData(this.sessions[id]).then((br) => {
            if(this.nobList.toArray()[id] && this.nobList.toArray()[id].value.upper){
              this.plotAnalysis(br, id,this.nobList.toArray()[id].value.lower * 10, this.nobList.toArray()[id].value.upper * 10)
              this.updateEvents(br, id)
            }
            else{
              this.plotAnalysis(br, id)
              this.updateEvents(br, id)
            }
          })
          
        }
        else{
          if(this.nobList.toArray()[id].value.upper){
            this.plotAnalysis(res[0], id,this.nobList.toArray()[id].value.lower * 10, this.nobList.toArray()[id].value.upper * 10)
            this.updateEvents(res[0], id)
          }
          else{
            this.plotAnalysis(res[0], id)
            this.updateEvents(res[0], id)
          }
        }
      })
    }
  }

  async updateTimeAxis(low, high, idx){
    low = low * 10
    high = high * 10
    let data = []
    let numPoints = 20

    let indexes = []
    let labels = []
    for(let i = 0; i < numPoints; ++i){
      indexes.push(Math.round(low + Math.floor(i * (high - low) / 20)))
      labels.push(Math.round((low + Math.floor(i * (high - low) / 20)) * 10) / 100)
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
  
  
        this.lineChart[idx].data.labels = labels
        if(this.modeSelected[idx] != "temp"){
          this.lineChart[idx].data.datasets = [{
            label: 'Air Flow (m/s)',
            data: data,
            fill: false,
            borderColor: 'rgb(97, 18, 36)',
            tension: 0.1
          }]
        }
        else{
          this.lineChart[idx].data.datasets = [{
            label: 'Temperature (C)',
            data: data,
            fill: false,
            borderColor: 'rgb(128,128,128)',
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

  delete(idx){
    let sessID = this.sessions[idx].sessionID

    this.dataService.deleteSession(this.sessions[idx])
    this.dataService.getPacketsForSession(sessID).subscribe((res) => {
      res.forEach(val => {
        this.dataService.deletePacket(val)
      })
    })
    this.dataService.getBreathingById(sessID).subscribe((res) => {
      res.forEach(val => {
        this.dataService.deleteBreathingRate(val)
      })
    })
  }

  expandEvents(idx){
    if(this.eventsDroppedDown[idx]){
      this.eventsDroppedDown[idx] = false
    }
    else{
      this.eventsDroppedDown[idx] = true
    }
  }

  localWrite(idx){
    let msg = "Local Write " + idx
    console.log(msg)
    this.dataService.saveToDisk(this.sessions[idx], this.platForm)
  }

}
