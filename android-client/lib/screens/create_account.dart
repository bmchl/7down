import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/screens/login.dart';

class CreateAccount extends StatefulWidget {
  const CreateAccount({super.key});

  @override
  CreateAccountState createState() => CreateAccountState();
}

class CreateAccountState extends State<CreateAccount> {
  final _formKey = GlobalKey<FormState>();
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final DatabaseReference _userRef =
      FirebaseDatabase.instance.reference().child('users');

  String _email = '';
  String _username = '';
  String _password = '';
  String _hometown = '';
  String _errorMessage = '';
  String _successMessage = '';
  List<String> _defaultAvatarUrls = [];
  String? _selectedAvatarUrl;
  final String _selectedLanguage = 'en';

  @override
  void initState() {
    super.initState();
    fetchDefaultAvatars();
  }

  void fetchDefaultAvatars() async {
    try {
      final storage = FirebaseStorage.instance;
      final imagesRef = storage.ref().child('default-images');
      final imagesList = await imagesRef.listAll();
      final urls = await Future.wait(
        imagesList.items.map((itemRef) => itemRef.getDownloadURL()),
      );
      setState(() {
        _defaultAvatarUrls = urls;
        _selectedAvatarUrl = urls.isNotEmpty ? urls.first : null;
      });
    } catch (error) {
      print('Error fetching default avatars: $error');
    }
  }

  void _submitCreateAccount() async {
    final isValid = _formKey.currentState!.validate();
    if (!isValid) {
      return;
    }

    _formKey.currentState!.save();

    DatabaseEvent databaseEvent =
        await _userRef.orderByChild('username').equalTo(_username).once();

    DataSnapshot dataSnapshot = databaseEvent.snapshot;

    if (dataSnapshot.value != null) {
      setState(() {
        _errorMessage =
            'The username $_username is already taken. Please choose another one.';
        _successMessage = '';
      });
      return;
    }

    try {
      UserCredential userCredential =
          await _auth.createUserWithEmailAndPassword(
        email: _email,
        password: _password,
      );

      await _userRef.child(userCredential.user!.uid).set({
        'email': _email,
        'username': _username,
        'hometown': _hometown,
        'avatarUrl': _selectedAvatarUrl,
        'isLoggedIn': false,
        'language': _selectedLanguage,
      });
      setState(() {
        _successMessage = 'Account created successfully!';
        _errorMessage = '';
      });

      await Future.delayed(const Duration(seconds: 2));
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const Login()),
      );
    } on FirebaseAuthException catch (e) {
      if (e.code == 'weak-password') {
        setState(() {
          _errorMessage = 'The password provided is too weak.';
        });
      } else if (e.code == 'email-already-in-use') {
        setState(() {
          _errorMessage = 'The account already exists for that email.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error creating account. Please try again.';
      });
    }
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: Text(
              AppLocalizations.of(context)!.translate('Create Account Page'))),
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
                  validator: (value) {
                    if (value == null ||
                        value.isEmpty ||
                        !_isValidEmail(value)) {
                      return 'Please enter a valid email.';
                    }
                    return null;
                  },
                  onSaved: (value) => _email = value ?? '',
                ),
                TextFormField(
                  decoration: InputDecoration(
                      labelText:
                          AppLocalizations.of(context)!.translate('Username')),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a username.';
                    } else if (value.length > 10) {
                      return 'Username must be at maximum 10 characters.';
                    }
                    return null;
                  },
                  onSaved: (value) => _username = value ?? '',
                ),
                TextFormField(
                  decoration: InputDecoration(
                      labelText:
                          AppLocalizations.of(context)!.translate('Password')),
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a password.';
                    }
                    return null;
                  },
                  onSaved: (value) => _password = value ?? '',
                ),
                TextFormField(
                  decoration: InputDecoration(
                      labelText:
                          AppLocalizations.of(context)!.translate('Hometown')),
                  onSaved: (value) => _hometown = value ?? '',
                ),
                const SizedBox(height: 16),
                if (_defaultAvatarUrls.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(AppLocalizations.of(context)!
                          .translate('Select Avatar')),
                      ..._defaultAvatarUrls.map((url) {
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          onTap: () {
                            setState(() {
                              _selectedAvatarUrl = url;
                            });
                          },
                          title: Row(
                            children: [
                              Radio<String>(
                                value: url,
                                groupValue: _selectedAvatarUrl,
                                onChanged: (value) {
                                  setState(() {
                                    _selectedAvatarUrl = value;
                                  });
                                },
                              ),
                              CircleAvatar(
                                backgroundImage: Image.network(url).image,
                                radius: 40,
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ElevatedButton(
                  onPressed: _submitCreateAccount,
                  child: Text(AppLocalizations.of(context)!
                      .translate('Submit Creation')),
                ),
                if (_errorMessage.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Text(_errorMessage,
                        style: const TextStyle(color: Colors.red)),
                  ),
                if (_successMessage.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Text(_successMessage,
                        style: const TextStyle(color: Colors.green)),
                  ),
                TextButton(
                  child: Text(
                      AppLocalizations.of(context)!.translate('Login switch')),
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (context) => const Login()),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
