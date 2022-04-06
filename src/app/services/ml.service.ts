import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import * as tf from "@tensorflow/tfjs"
import { scalar } from '@tensorflow/tfjs';

@Injectable({
  providedIn: 'root'
})
export class MLService {

  constructor(private dataService: DataService) { }


  async analyizeData(session){
    var id = session.sessionID
    var breathingRate: number[] = []
    var localOutlierIdx: number[] = []

    //Hanning Windows 
    let Window = tf.signal.hannWindow(62)
    Window = Window.pad([[31, 31]])

    this.dataService.getPacketsForSession(id).subscribe((res) => {
      res.forEach((val, num) => {
        
        let packetData = tf.tensor1d(val.data.slice(0,124))
        
        
        let packetMoments = tf.moments(packetData, 0, true) 
        let packetStd = tf.sqrt(packetMoments.variance)

        //remove dc componenet
        packetData = tf.sub(packetData, packetMoments.mean)

        //Find Local Outliers
        let isOutlier = tf.abs(packetData).greater(packetStd.mul(tf.scalar(2)))
        tf.whereAsync(isOutlier).then(data => {
          data.data().then(idxs => {
            idxs.forEach(loc => {
              localOutlierIdx.push((loc + (num * 124)) / 10)
            })
          })
        })

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
              this.dataService.addBreathingRate({sessionID: id, data: breathingRate, localOutliers: localOutlierIdx})
              return {sessionID: id, data: breathingRate, localOutliers: localOutlierIdx}
            }
          })
        }) 
      })
    })
  }
}
