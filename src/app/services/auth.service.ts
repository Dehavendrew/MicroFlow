import { Injectable, NgZone } from '@angular/core';
import { AngularFireAuth, PERSISTENCE } from '@angular/fire/compat/auth';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { User } from './user';
import { docData, doc, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { setPersistence } from 'firebase/auth';
import { getAuth, indexedDBLocalPersistence, signInWithEmailAndPassword } from '@angular/fire/auth'


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  userData: any
  
  constructor(public afs: AngularFirestore, public afAuth: AngularFireAuth, public router: Router, public ngZone: NgZone, private firestore: Firestore) {}

  SignIn(email: string, password: string){
      return this.afAuth.signInWithEmailAndPassword(email, password).then((res) => {
        this.ngZone.run(() => {
          this.router.navigate(['home']);
        });
        //this.GetUserData(res.user);
      })
    .catch((error) => {
      window.alert(error.message);
    })
  }

  SignUp(email: string, password: string, dName: string){
    return this.afAuth.createUserWithEmailAndPassword(email, password).then((res) => {
      this.SetUserData(res.user, dName)
      this.router.navigate(['home'])
    }).catch((error) => {
      window.alert(error.message);
    })
  }

  ForgotPassword(resetEmail: string){
    return this.afAuth.sendPasswordResetEmail(resetEmail).then((res) => {
      window.alert('Password Reset Email Sent, Check your Inbox');
    }).catch((error) => {
      window.alert(error.message);
    })
  }

  GetUserData(user: any): Observable<User>{
    if (!user.uid) return
    const userRef =  doc(this.firestore, `users/${user.uid}`);
    return docData(userRef, { idField: 'uid'}) as Observable<User>
  }

  SetUserData(user: any, dName: string){
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(`users/${user.uid}`);

    const userData: User = {
      uid: user.uid,
      email: user.email,
      displayName: dName,
      photoURL: user.photoURL
    };

    return userRef.set(userData, {
      merge:true
    })
  }

  SignOut(){
    return this.afAuth.signOut().then(() => {
      //this.router.navigate(['sign-in'])
    })
  }
  
  get isLoggedIn(): Observable<User> {
    return this.afAuth.authState as Observable<User>
  }
}
