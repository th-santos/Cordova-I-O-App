package ca.bcit.comp2052.a01034486.week9;

import android.os.Bundle;
import org.apache.cordova.*;
import android.webkit.WebView;

public class MainActivity extends CordovaActivity
{
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        // using webview
        super.init();
        WebView webView1 = (WebView)appView.getEngine().getView();
        webView1.addJavascriptInterface(new ToastWrapper(this), "AndroidToast");

        // enable Cordova apps to be started in the background
        Bundle extras = getIntent().getExtras();
        if (extras != null && extras.getBoolean("cdvStartInBackground", false)) {
            moveTaskToBack(true);
        }

        // Set by <content src="index.html" /> in config.xml
        loadUrl(launchUrl);
    }
}
