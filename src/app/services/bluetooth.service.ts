import { Injectable } from '@angular/core';
import { Session } from './session';

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {

  constructor() { }

  async downloadStoredData(sess: Session): Promise<Session>{
    var dataArray: number[] = []
    for (let i = 0; i < sess.numSamples; i++) {
      dataArray.push(Math.random())
      dataArray.push(0)
    }

    return new Promise( resolve => {
      setTimeout(resolve, 1000) 
      sess.data = dataArray
      resolve(sess)
    });
  }
}
