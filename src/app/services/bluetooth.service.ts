import { Injectable } from '@angular/core';
import { Session } from './session';
import { DataService } from './data.service';
import { Observable } from 'rxjs';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {

  packetSize = 250
  numMetrics = 2
  currentLoadPercent = 0
  slidingWindowSize = 2
  timeout = 2000
  pointsPerGraph = 20

  testFailureRate = 0.5
  unAckedPackets: Number [] = []
  sentAckedPackets: Number [] = [] 

  //Blue tooth connection strings
  microFlowDevice = null
  BAND_SERVICE = '19B10000-E8F2-537E-4F6C-D104768A1214'.toLowerCase();
  BAND_CHAR= "19B10001-E8F2-537E-4F6C-D104768A1214".toLowerCase();
  

  constructor(private toastCtrl: ToastController, private dataService: DataService) { } 

  async requestLivePacket(): Promise<number[]>{
    var dataArray: number[] = []
    for (let idx = 0; idx < 25; idx++) {
      dataArray.push(1 * Math.sin(2*3.1415* 0.1 * idx) + 4 + Math.random())
    }
    for (let idx = 0; idx < 25; idx++) {
      dataArray.push(32 + Math.random())
    }

    // const result = await BleClient.read(this.microFlowDevice.deviceId, this.BAND_SERVICE, this.BAND_CHAR);
    // console.log('Data VAlue', result.getUint8(0));

    return new Promise(res => {
      res(dataArray)
    })

  }
  
  async startListenForPackets(calledBack: Function, that: any){
    //Starts notificaiton service to read new values from the arduino
    await BleClient.startNotifications(
      this.microFlowDevice.deviceId,
      this.BAND_SERVICE,
      this.BAND_CHAR,
      (value) => {
        calledBack(value, that)
      }
    );
  }

  async stopListenForPackets(){
    //stop notfications and disconnect microcontrollers
    await BleClient.stopNotifications(this.microFlowDevice.deviceId,this.BAND_SERVICE,this.BAND_CHAR,);
    await BleClient.disconnect(this.microFlowDevice.deviceId);
  }

  async connectBLE(){

    //create notification object
    let toast = this.toastCtrl.create({
      message: 'Connected To MicroFlow Device',
      duration: 3000,
      position: 'bottom'
    });

    //initalize native BLE module
    await BleClient.initialize();
    console.log("Bluetoot Initalized")

    //Request device from ble client
    BleClient.requestDevice({
      services: [this.BAND_SERVICE],
    }).then((device) => {
      //save device and run conneciton routine
      this.microFlowDevice = device
      BleClient.connect(device.deviceId, (deviceId) => this.onDisconnect(deviceId));
      console.log('connected to device', device);
      toast.then((res) => {
        res.present()
        return
      })
    }).catch(() => {
      console.log("No Device Found")
    });
  }

  onDisconnect(deviceId: string): void {
    //Create notification setting on device close
    let toast = this.toastCtrl.create({
      message: 'Disconnected From MicroFlow Device',
      duration: 3000,
      position: 'bottom'
    });
    console.log(`device ${deviceId} disconnected`);
    toast.then((res) => {
      res.present()
    })
  }

  async sendPacketTest(i): Promise<number[]>{
    var dataArray: number[] = []
    for (let idx = 0; idx < this.packetSize / this.numMetrics; idx++) {
      if(idx == 57){
        dataArray.push(7.5)
      }
      else{
        dataArray.push(1 * Math.sin(2*3.1415* 0.1 * idx) + 4)
      }
    }
    for (let idx = 0; idx < this.packetSize / this.numMetrics; idx++) {
      dataArray.push(32 + Math.random())
    }

    if (true){
      return new Promise((resolve1, reject1) => {
        setTimeout(resolve => {
          this.unAckedPackets.push(i)
          var thresh = Math.random()
          if(thresh > this.testFailureRate){
              resolve1(dataArray)
          }
          else{
            console.log("LOST PACKET")
            reject1("Lost Packet")
          }
        }, 1)
      });
    }
    else{
      var msg = "Awating ACK " + this.unAckedPackets[0]
      console.log(msg)
      await this.awaitAckFromCentral().then((res) => {
        console.log("Got Ack")
        return new Promise((resolve1, reject1) => {
          setTimeout(resolve => {
            this.unAckedPackets.push(i)
            var thresh = Math.random()
            if(thresh > this.testFailureRate){
              console.log(thresh)
              resolve1(dataArray)
            }
            else{
              console.log("LOST PACKET")
              reject1("Lost Packet")
            }
            }, 1000)
        });
      }).catch((err) => console.log(err))
    }
  }

  async awaitAckFromCentral(){
    return new Promise((resolve, reject) => {
      var counter = 0
      console.log("Test")
      while(this.unAckedPackets.length >= this.slidingWindowSize){
        console.log(this.unAckedPackets.length)
        if(counter > this.timeout){
          console.log(counter)
          reject("Timeout")
          break
        }
        counter++
      }
      resolve
    })
  }

  async ackFromCentral(i) {
    var msg = "Preparing to send ACK " + i
    console.log(msg)
    var NumSecs = Math.floor(Math.random() * 10)
    return new Promise( resolve => {
      setTimeout(resolve1 => {
        this.sentAckedPackets.push(i)
        for (let idx = 0; idx < this.unAckedPackets.length; idx++){
          if(this.unAckedPackets[idx] == i){
            this.unAckedPackets.splice(idx, 1);
            var msg = "Sending ACK " + i
            console.log(msg)
            resolve
          }
        }
        resolve(msg)
      }
      , NumSecs) 
      })
  }

  async requestDataStream(sess: Session, writeLocal: boolean = false): Promise<Session>{
    this.currentLoadPercent = 0
    var numPackets = Math.ceil(sess.numSamples / (this.packetSize / this.numMetrics))
    var recievedPackets = 0
    var msg = "Requested data stream: " + sess.sessionID
    console.log(msg)

    var summaryPointsPerPacket = Math.ceil(this.pointsPerGraph / numPackets)
    var sizePointGap = Math.floor((this.packetSize / summaryPointsPerPacket) / this.numMetrics)

    var packetSep = numPackets / this.pointsPerGraph

    var summaryArray: number[] = []
    var tempsummaryArray: number[] = []
    var indexArray: number[] = []

    var fullDataArray: number[] = []
    var fullTempArray: number[] = []

    const average = (array) => array.reduce((a, b) => a + b) / array.length;


    for(let i = 0; i < numPackets; i++){
      msg = "Requesting Packet " + i
      console.log(msg)
      await this.sendPacketTest(i).then((res) => {
        msg = "Got Packet " + i
        console.log(msg)
        if(numPackets <= 20){
          for(let j = 0; j < summaryPointsPerPacket; ++j){
            summaryArray.push(average(res.slice(sizePointGap*j,sizePointGap*j + sizePointGap)))
            tempsummaryArray.push(average(res.slice((this.packetSize / this.numMetrics) + sizePointGap*j,(this.packetSize / this.numMetrics) + sizePointGap*j + sizePointGap)))
            indexArray.push(Math.ceil((sizePointGap * j) + (i * (this.packetSize / this.numMetrics))))
          }
        }
        else{
          if(i == Math.floor(summaryArray.length * packetSep)){
            summaryArray.push(average(res.slice(0,this.packetSize / this.numMetrics)))
            tempsummaryArray.push(average(res.slice(this.packetSize / this.numMetrics, this.packetSize)))
            indexArray.push(Math.floor(i * this.packetSize / this.numMetrics))
          }
        }
        if(!writeLocal){
          this.dataService.addRawPacket({sessionID: sess.sessionID, idx: i, data: res}).then((res) => {
            recievedPackets++
            this.currentLoadPercent = recievedPackets / numPackets
          })
        }
        else{
          fullDataArray = fullDataArray.concat(res.slice(0,125))
          fullTempArray = fullTempArray.concat(res.slice(125,250))
          recievedPackets++
          this.currentLoadPercent = recievedPackets / numPackets
        }
      }).catch(err => i = i - 1)
      await this.ackFromCentral(i).then((res) => {console.log("Done acking")})
    }

    if(writeLocal){
      return new Promise(resolve => {
        sess.data = fullDataArray
        sess.indexes = indexArray
        sess.tempdata = fullTempArray
        resolve(sess)
      })
    }
    else{
      return new Promise(resolve => {
        sess.data = summaryArray
        sess.indexes = indexArray
        sess.tempdata = tempsummaryArray
        resolve(sess)
      })
    }
  }


  async downloadStoredDataTest(sess: Session): Promise<Session>{
    var dataArray: number[] = []
    for (let i = 0; i < sess.numSamples; i++) {
      dataArray.push(Math.random())
      dataArray.push(0)
    }

    return new Promise( resolve => {
      setTimeout(resolve, 1) 
      sess.data = dataArray
      resolve(sess)
    });
  }
}
