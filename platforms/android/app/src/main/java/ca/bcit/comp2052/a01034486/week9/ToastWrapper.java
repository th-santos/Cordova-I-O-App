package ca.bcit.comp2052.a01034486.week9;

import org.apache.cordova.*;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

public class ToastWrapper {
	private CordovaActivity context;

	public ToastWrapper(CordovaActivity webView) {
		context = webView;
	}

	@JavascriptInterface
	public void showShortToast(String message) {
		Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
	}
	
	@JavascriptInterface
	public void showLongToast(String message) {
		Toast.makeText(context, message, Toast.LENGTH_LONG).show();
	}
}