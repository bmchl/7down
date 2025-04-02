import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/screens/login.dart';

class Settings extends StatefulWidget {
  const Settings({Key? key}) : super(key: key);

  @override
  State<Settings> createState() => _SettingsState();
}

class _SettingsState extends State<Settings> {
  @override
  void initState() {
    super.initState();
    _getUserPreferences();
  }

  final bool _isLoggedIn = true;
  final userNameController = TextEditingController();
  final user = FirebaseAuth.instance.currentUser;
  final DatabaseReference _userRef =
      FirebaseDatabase.instance.reference().child('users');

  // For theme selection
  String _themeMode = 'Auto'; // Default theme mode
  final List<String> _themeModes = ['Light', 'Dark', 'Auto'];

  // For language selection
  String _selectedLanguage = 'en'; // Default language

  void setThemeMode(String mode) {
    // save to firebase for user
    FirebaseDatabase.instance
        .reference()
        .child('users')
        .child(user!.uid)
        .child('themeMode')
        .set(mode.toLowerCase())
        .catchError((error) {
      print('Error updating theme mode: $error');
    });

    setState(() {
      _themeMode = mode;
    });
  }

  void setLanguage(String language) {
    // save to firebase for user
    FirebaseDatabase.instance
        .reference()
        .child('users')
        .child(user!.uid)
        .child('language')
        .set(language)
        .catchError((error) {
      print('Error updating language: $error');
    });

    setState(() {
      _selectedLanguage = language;
    });
  }

  void _getUserPreferences() {
    if (user != null) {
      FirebaseDatabase.instance
          .reference()
          .child('users')
          .child(user!.uid)
          .child('themeMode')
          .onValue
          .listen((event) {
        final themeModeValue = event.snapshot.value as String?;
        switch (themeModeValue) {
          case 'dark':
            setState(() {
              _themeMode = 'Dark';
            });
            break;
          case 'light':
            setState(() {
              _themeMode = 'Light';
            });
            break;
          default:
            setState(() {
              _themeMode = 'Auto';
            });
        }
      });

      FirebaseDatabase.instance
          .reference()
          .child('users')
          .child(user!.uid)
          .child('language')
          .onValue
          .listen((event) {
        final languageValue = event.snapshot.value as String?;
        setState(() {
          _selectedLanguage = languageValue ?? 'en';
        });
      });
    }
  }

  void signUserOut() {
    FirebaseAuth.instance.signOut().then((_) {
      _userRef
          .child(user!.uid)
          .update({'isLoggedIn': false}).catchError((error) {
        print('Error updating user status: $error');
      });
    }).catchError((error) {
      print('Error signing out: $error');
    });
  }

  void openLogin() {
    showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
          minWidth: MediaQuery.of(context).size.width * 0.7,
          maxWidth: MediaQuery.of(context).size.width * 0.7,
        ),
        builder: (context) => const Login());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.translate('Settings')),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: ListView(
          children: [
            // Theme mode selection
            ListTile(
              title: Text(AppLocalizations.of(context)!.translate('Theme')),
              trailing: DropdownButton(
                value: _themeMode,
                items: _themeModes.map((String mode) {
                  return DropdownMenuItem(
                    value: mode,
                    child: Text(mode),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  setThemeMode(newValue!);
                },
              ),
            ),
            // Language selection
            ListTile(
              title: Text(AppLocalizations.of(context)!.translate('Language')),
              trailing: DropdownButton(
                value: _selectedLanguage,
                items: const [
                  DropdownMenuItem(
                    value: 'en',
                    child: Text('English'),
                  ),
                  DropdownMenuItem(
                    value: 'fr',
                    child: Text('Français'),
                  ),
                ],
                onChanged: (String? newValue) {
                  setState(() {
                    _selectedLanguage = newValue!;
                  });
                  setLanguage(newValue!);
                },
              ),
            ),
            // Existing sign in/out logic
            Center(
                child: SizedBox(
                    width: 150,
                    child: StreamBuilder(
                      stream: FirebaseAuth.instance.authStateChanges(),
                      builder: (context, AsyncSnapshot<User?> snapshot) {
                        if (snapshot.connectionState ==
                            ConnectionState.waiting) {
                          return const Center(
                            child: CircularProgressIndicator(),
                          );
                        } else if (snapshot.hasData) {
                          return ElevatedButton(
                            onPressed: signUserOut,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                const Icon(Icons.logout),
                                const SizedBox(width: 5),
                                Text(
                                  AppLocalizations.of(context)!
                                      .translate('Logout'),
                                ),
                              ],
                            ),
                          );
                        } else {
                          return ElevatedButton(
                            onPressed: () => openLogin(),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                const Icon(Icons.login),
                                const SizedBox(width: 5),
                                Text(
                                  AppLocalizations.of(context)!
                                      .translate('Login'),
                                ),
                              ],
                            ),
                          );
                        }
                      },
                    )))
          ],
        ),
      ),
    );
  }
}
