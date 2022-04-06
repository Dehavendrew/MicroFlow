import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import * as tf from "@tensorflow/tfjs"

@Injectable({
  providedIn: 'root'
})
export class MLService {

  constructor(private dataService: DataService) { }


  async analyizeData(session){
    var id = session.sessionID
    var breathingRate: number[] = []

    //Hanning Windows 
    let Window = tf.signal.hannWindow(62)
    Window = Window.pad([[31, 31]])

    this.dataService.getPacketsForSession(id).subscribe((res) => {
      res.forEach((val) => {
        
        let packetData = tf.tensor1d(val.data.slice(0,124))
        
        //remove dc componenet
        packetData = tf.sub(packetData, packetData.mean(0,true))

        //Window data
        packetData = tf.mul(packetData, Window)

        //Perform fft
        let freqData = tf.spectral.rfft(packetData)

        freqData = tf.abs(freqData)

        tf.argMax(freqData).data().then(data => {
          freqData.data().then(freqD => {
            let maxIdx = data[0]
            //Weight average max index
            if(maxIdx > 0){
              maxIdx = maxIdx - (0.5 * freqD[maxIdx - 1]/freqD[maxIdx])
            }
            if(maxIdx < 60){
              maxIdx = maxIdx + (0.5 * freqD[maxIdx + 1]/freqD[maxIdx])
            }
            breathingRate.push(data[0] / 124 * 60)

            //Write to Database
            if(breathingRate.length == res.length){
              this.dataService.addBreathingRate({sessionID: id, data: breathingRate})
              return {sessionID: id, data: breathingRate}
            }
          })
        }) 
      })
    })
  }
}
