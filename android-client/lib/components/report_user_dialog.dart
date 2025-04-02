import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';

class ReportUserDialogComponent extends StatefulWidget {
  final String senderId;
  final int index;

  const ReportUserDialogComponent({
    Key? key,
    required this.senderId,
    required this.index,
  }) : super(key: key);

  @override
  _ReportUserDialogComponentState createState() =>
      _ReportUserDialogComponentState();
}

class _ReportUserDialogComponentState extends State<ReportUserDialogComponent> {
  String? selectedReason;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(AppLocalizations.of(context)!.translate('Report a User')),
      content: SingleChildScrollView(
        child: ListBody(
          children: <Widget>[
            Text(AppLocalizations.of(context)!
                .translate('Select a reason for reporting the user:')),
            DropdownButton<String>(
              hint: Text(AppLocalizations.of(context)!.translate("Reason")),
              value: selectedReason,
              onChanged: (String? newValue) {
                setState(() {
                  selectedReason = newValue;
                });
              },
              items: <String>[
                AppLocalizations.of(context)!.translate('Sexism'),
                AppLocalizations.of(context)!.translate('Racism'),
                AppLocalizations.of(context)!.translate('Homophobia'),
                AppLocalizations.of(context)!.translate('Discrimination'),
                'Spam',
              ].map<DropdownMenuItem<String>>((String value) {
                return DropdownMenuItem<String>(
                  value: value,
                  child: Text(value),
                );
              }).toList(),
            ),
          ],
        ),
      ),
      actions: <Widget>[
        TextButton(
          child: Text(AppLocalizations.of(context)!.translate('Cancel')),
          onPressed: () {
            Navigator.of(context).pop();
          },
        ),
        TextButton(
          child: Text(AppLocalizations.of(context)!.translate('Submit')),
          onPressed: () {
            if (selectedReason != null) {
              // Send report here
              Navigator.of(context).pop(selectedReason);
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(AppLocalizations.of(context)!
                      .translate('Please select a reason for reporting')),
                  duration: Duration(seconds: 2),
                ),
              );
            }
          },
        ),
      ],
    );
  }
}
