import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/MyDisconnectHandler.dart';
import 'package:flutterapp/nav.dart';
import 'package:flutterapp/screens/ForgetPassword.dart';
import 'package:flutterapp/screens/create_account.dart';

class Login extends StatefulWidget {
  const Login({Key? key}) : super(key: key);

  @override
  LoginState createState() => LoginState();
}

class LoginState extends State<Login> {
  final _formKey = GlobalKey<FormState>();
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final DatabaseReference _userRef =
      FirebaseDatabase.instance.reference().child('users');
  String _email = '';
  String _password = '';
  String _errorMessage = '';

  void registerToken() {
    FirebaseMessaging.instance.getToken().then((fcmToken) {
      if (fcmToken != null) {
        // If the token is immediately available, proceed to register it.
        updateToken(fcmToken);
      }
    });

    // Set up a listener that waits for the token to be initialized.
    FirebaseMessaging.instance.onTokenRefresh.listen(updateToken);
  }

  void updateToken(String fcmToken) async {
    await _userRef.child(FirebaseAuth.instance.currentUser!.uid).update({
      'fcmToken': fcmToken,
    });
    print('Registered token: $fcmToken');
  }

  void _submitLogin() async {
    final isValid = _formKey.currentState!.validate();
    if (!isValid) {
      return;
    }

    _formKey.currentState!.save();

    try {
      UserCredential userCredential = await _auth.signInWithEmailAndPassword(
        email: _email,
        password: _password,
      );

      if (userCredential.user != null) {
        DatabaseEvent userRef =
            await _userRef.child(userCredential.user!.uid).once();
        DataSnapshot snapshot = userRef.snapshot;

        // Check if the user profile contains all required fields
        Map<dynamic, dynamic>? userData =
            snapshot.value as Map<dynamic, dynamic>?;
        if (userData != null && _isProfileComplete(userData)) {
          await _userRef
              .child(userCredential.user!.uid)
              .update({'isLoggedIn': true});
          MyDisconnectHandler().monitorDisconnect(userCredential.user!.uid);
          registerToken();
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const NavRailExample()),
          );
        } else {
          setState(() {
            _errorMessage = 'Can not log in to this account.';
          });
          await _auth.signOut();
        }
      }
    } on FirebaseAuthException catch (e) {
      if (e.code == 'user-not-found' || e.code == 'wrong-password') {
        setState(() {
          _errorMessage = 'Incorrect email or password.';
        });
      } else {
        setState(() {
          _errorMessage = e.message ?? 'Error during login. Please try again.';
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Error during login. Please try again.';
        });
      }
    }
  }

  bool _isProfileComplete(Map<dynamic, dynamic> userData) {
    final requiredFields = ['username', 'email', 'isLoggedIn'];

    for (final field in requiredFields) {
      if (!userData.containsKey(field) || userData[field] == null) {
        return false;
      }
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar:
          AppBar(title: Text(AppLocalizations.of(context)!.translate('Login'))),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) => value != null && value.isEmpty
                      ? 'Please enter your email.'
                      : null,
                  onSaved: (value) => _email = value ?? '',
                ),
                TextFormField(
                  decoration: InputDecoration(
                      labelText:
                          AppLocalizations.of(context)!.translate('Password')),
                  obscureText: true,
                  validator: (value) => value != null && value.isEmpty
                      ? 'Please enter your password.'
                      : null,
                  onSaved: (value) => _password = value ?? '',
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _submitLogin,
                  child: Text(AppLocalizations.of(context)!.translate('Login')),
                ),
                TextButton(
                  child: Text(AppLocalizations.of(context)!
                      .translate("Create Account")),
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                          builder: (context) => const CreateAccount()),
                    );
                  },
                ),
                TextButton(
                  child: Text(AppLocalizations.of(context)!
                      .translate('Forgot Password')),
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                          builder: (context) => const ForgetPassword()),
                    );
                  },
                ),
                if (_errorMessage.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Text(_errorMessage,
                        style: const TextStyle(color: Colors.red)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
