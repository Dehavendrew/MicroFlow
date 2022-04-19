import { Component, OnInit, ViewChildren } from '@angular/core';
import { Session } from '../services/session';
import { ToastController } from '@ionic/angular';
import { DataService } from '../services/data.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuthService } from '../services/auth.service';
import { User } from '../services/user';
import { Observable } from 'rxjs';
import { BluetoothService } from '../services/bluetooth.service';
import { Chart, registerables, TooltipLabelStyle } from 'chart.js';
import { Filesystem, Directory, Encoding, FilesystemDirectory, } from '@capacitor/filesystem';
import {Platform} from '@ionic/angular';

export interface Task {
  session: Session,
  id: number,
  task: string,
  completed: boolean
}

@Component({
  selector: 'app-connect',
  templateUrl: './connect.page.html',
  styleUrls: ['./connect.page.scss'],
})
export class ConnectPage implements OnInit {

  isLoading: boolean
  isLoaded: boolean
  isQuerying: boolean
  isQueried: boolean
  isImporting: boolean
  isImported: boolean
  DownloadLocal: boolean
  isModeSelected: boolean
  LoadLiveData: boolean
  UserStop: boolean

  deviceName: string
  numSessionsOnDisk: number
  numMinutesOnDisk: number
  sessions: Session[] = [];
  Livesession: Session;

  LiveStream: any;
  rollingPlotData: number[] = []
  subPacketsRecieved: number = 0;
  packetData: number[] = []
  packetTempData: number[] = []

  taskQueue: Task[] = []

  platForm: string;

  user: User

  @ViewChildren("charts") lineCanvas: any;
  private lineChart: Chart[] = [];

  constructor(private platform: Platform, private toastCtrl: ToastController, public dataService: DataService, public afAuth: AngularFireAuth, public authService: AuthService, public bleService: BluetoothService) {
    this.resetPairing()
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

  ngOnInit() {
  }

  authStatusListener(){
    this.afAuth.onAuthStateChanged((cred) => {
      if(cred){
        this.user = cred
      }
      else{
        this.user = null
      }
    })
  }


  async searchForDevice(){
    console.log("Searching For Device")
    this.isLoading = true
    return new Promise( resolve => {
      setTimeout(resolve, 100) 

      this.deviceName = "Drew's Micro Flow"
    });
  }

  async queryDevice(){
    console.log("Querying For Device")
    this.isQuerying = true;
    return new Promise( resolve => {
      setTimeout(resolve, 100) 

      var Numsamples = 0

      for (let j = 0; j < 5; j++){
        var currentTime = new Date()
        var sess_id = Math.floor(Math.random() * 1000000000)
        var NumsamplesTest = Math.floor(Math.random() * 1000)
        this.sessions.push({uid: this.user.uid, date: currentTime, data: null, sessionID:sess_id, numSamples: NumsamplesTest })
        Numsamples = Numsamples + NumsamplesTest
      }
      
      this.numSessionsOnDisk = this.sessions.length
      this.numMinutesOnDisk = Numsamples / 10

    });
  }

  async cloudWrite(i){
    if(await this.checkTaskInQueue(i)){
      return
    }
    
    this.isImporting = true
    let msg = "Writing Session " + i + " To Firebase"
    console.log(msg)

    let sess = null
    console.log(this.sessions)
    for (let idx = 0; idx < this.sessions.length; idx++){
      if(this.sessions[idx].sessionID == i){
        sess = this.sessions[idx]
      }
    }

    this.taskQueue.push({session: sess, id: i, task: "Cloud Write ", completed: false})

    this.bleService.requestDataStream(sess).then((res) => {
      this.dataService.addSession(res).then(res => {
        for (let task of this.taskQueue) {
          if(task.id == i){
            task.completed = true
            console.log("Done")
          }
        }
        for (let idx = 0; idx < this.sessions.length; idx++){
          if(this.sessions[idx].sessionID == i){
            this.sessions.splice(idx, 1);
          }
        }
        this.updateStats()
      })
    })
  }

  async localWrite(i){
    this.isImporting = true
    let msg = "Writing Session " + i + " To Local"
    console.log(msg)
    console.log(Directory.Documents)

    if (this.platForm == "web") {

      const rows = [
        ["name1", "city1", "some other info"],
        ["name2", "city2", "more info"]
      ];
        
      let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const data: string =  encodeURI(csvContent);
      const link: HTMLElement = document.createElement('a');
      link.setAttribute('href', data);
      link.setAttribute('download', "test.txt");
      link.click();
      return;
    }
    else{
      const fileName = 'text.txt'
      const savedFile = await Filesystem.writeFile({
      path:fileName,
      data: "This is a test file",
      directory: FilesystemDirectory.Documents
    })
    }
  }

  

  async delete(i){
    if(await this.checkTaskInQueue(i)){
      return
    }
    this.isImporting = true
    let msg = "Deleting Session " + i
    console.log(msg)
    this.taskQueue.push({session: this.sessions[i], id: i, task: "Delete ", completed: false})
    this.removeDataFromMF(i).then(res => {
      for (let task of this.taskQueue) {
        if(task.id == i){
          task.completed = true
          console.log("Done")
        }
      }
      for (let idx = 0; idx < this.sessions.length; idx++){
        if(this.sessions[idx].sessionID == i){
          this.sessions.splice(idx, 1);
        }
      }
      this.updateStats()
    })
  }

  async updateStats(){
    let numsamples = 0
    for (let idx = 0; idx < this.sessions.length; idx++){
      numsamples = numsamples + this.sessions[idx].numSamples
    }
    this.numSessionsOnDisk = this.sessions.length
    this.numMinutesOnDisk = numsamples / 10
  }

  async checkTaskInQueue(i){
    for (let task of this.taskQueue) {
      if(task.id == i && !task.completed){
        const toast = await this.toastCtrl.create({
          message: 'A Task for This Session is Already in the Queue',
          duration: 2000
        });
        toast.present()
        return true
      }
    }
    return false
  }

  async removeDataFromMF(i){
    return new Promise( resolve => {
      setTimeout(resolve, 1000) 
      return i
    });
  }

  async loadOffline(){
    this.isModeSelected = true
    this.DownloadLocal = true
  }

  addPacket(){
    this.bleService.requestLivePacket().then(res => {
      this.subPacketsRecieved = this.subPacketsRecieved + 1
      this.packetData = this.packetData.concat(res.slice(0,25))
      this.packetTempData = this.packetTempData.concat(res.slice(25,50))

      if(this.subPacketsRecieved == 5){
        this.subPacketsRecieved = 0
        this.dataService.addRawPacket({sessionID: this.Livesession.sessionID, idx: Math.floor(this.Livesession.numSamples / 150), data: this.packetData.concat(this.packetTempData)})
        this.packetData = []
        this.packetTempData = []
      }

      let labels = Array.from(Array(25).keys())
      this.rollingPlotData.shift()
      this.rollingPlotData.push(res[0])
      let sessData = this.rollingPlotData

      this.lineChart[0].data.labels = labels
      this.lineChart[0].data.datasets = [{
            label: 'Air Flow (m/s)',
            data: sessData,
            fill: false,
            borderColor: 'rgb(73, 138, 255)',
            tension: 0.1
      }]
        
      this.lineChart[0].update()
      this.Livesession.numSamples = this.Livesession.numSamples + 25
    })
  }

  LiveDataCollection(){
    if(this.UserStop){
      return
    }
    this.addPacket()
    return new Promise( resolve => {
      setTimeout(resolve => {
        this.LiveDataCollection()
      }, 500)
    })
  }

  async stopOnline(){
    this.UserStop = true
    let indexes = []
    let tempData = []
    let data = []
    if(this.subPacketsRecieved != 5){
      this.subPacketsRecieved = 0
      while(this.packetData.length < 125){
        this.packetData.push(0)
        this.packetTempData.push(0)
      }
      await this.dataService.addRawPacket({sessionID: this.Livesession.sessionID, idx: Math.floor(this.Livesession.numSamples / 150), data: this.packetData.concat(this.packetTempData)})
      this.packetData = []
      this.packetTempData = []
    }
    for(let i = 0; i < 20; ++i){
      indexes.push(Math.round(Math.floor(i * (this.Livesession.numSamples) / 20)))
    }
    await this.dataService.getPacketsForSession(this.Livesession.sessionID).subscribe((res) => {
      for(let i = 0; i < 20; ++i){
        tempData.push(res[Math.floor(indexes[i] / 125)].data[125 + indexes[i] % 125])
        data.push(res[Math.floor(indexes[i] / 125)].data[indexes[i] % 125])
      }

      this.Livesession.tempdata = tempData
      this.Livesession.data = data
      this.Livesession.indexes = indexes
      this.dataService.addSession(this.Livesession)
    })
  }

  startOnline(){
    this.isModeSelected= true
    this.LoadLiveData = true

    var currentTime = new Date()
    var sess_id = Math.floor(Math.random() * 1000000000)

    this.Livesession = {uid: this.user.uid, date: currentTime, data: null, sessionID:sess_id, numSamples: 0 }

    let labels = Array.from(Array(25).keys())
    this.rollingPlotData = Array(25)

    this.lineCanvas.toArray().forEach((el,idx) => {
      this.lineChart.push(new Chart(el.nativeElement, {
        type:"line",
        options:{
          animation:{
            duration: 0
          }
        },
        data: {
          labels: labels,
          datasets: [{
          label: 'Air Flow (m/s)',
          data: this.rollingPlotData,
          fill: false,
          borderColor: 'rgb(73, 138, 255)',
          tension: 0.1
        }]}
      }))
    })

    this.LiveDataCollection()
  }

  async pair(){
    this.resetPairing()

    //this.bleService.connectBLE()

    console.log("Begining Pairing")
    await this.searchForDevice()
    this.isLoaded = true

    await this.queryDevice()
    this.isQueried = true
    console.log("done")
  }

  resetPairing(){
    this.isLoading = false
    this.isLoaded = false
    this.isQuerying = false
    this.isQueried = false
    this.isImporting = false
    this.isImported = false
    this.sessions = []
    this.deviceName = null
    this.numMinutesOnDisk = null
    this.numSessionsOnDisk = null
    this.DownloadLocal = false
    this.isModeSelected = false
    this.LoadLiveData = false
    this.taskQueue = []
    this.lineChart = []
    this.Livesession = null
    this.UserStop = false
    this.LiveStream = null
    this.rollingPlotData = []
    this.subPacketsRecieved = 0;
    this.packetData = []
    this.packetTempData  = []
  }

}
