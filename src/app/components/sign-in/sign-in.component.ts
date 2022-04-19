import { Component, OnInit, NgZone  } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AngularFireAuth, PERSISTENCE } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
})
export class SignInComponent implements OnInit {

  constructor(public authService: AuthService, public afAuth: AngularFireAuth, public ngZone: NgZone, public router: Router) {
    this.afAuth.authState.subscribe(res => {
      if(res != null){
        this.ngZone.run(() => {
          this.router.navigate(['tabs']);
        });
      }
    })
   }

  ngOnInit() {}

}
