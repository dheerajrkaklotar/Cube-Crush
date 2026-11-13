package com.cubecrush.blockblast;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.webkit.WebViewAssetLoader;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

public class MainActivity extends Activity {

    // Real Production Google AdMob IDs provided by the user
    public static final String ADMOB_APP_ID = "ca-app-pub-8252748238984276~5299537409";
    public static final String BANNER_AD_UNIT_ID = "ca-app-pub-8252748238984276/8476685886";
    public static final String REWARDED_AD_UNIT_ID = "ca-app-pub-8252748238984276/1911277534";
    public static final String INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712";

    private WebView webView;
    private AdView bannerAdView;
    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;
    private boolean isLoadingRewarded = false;
    private boolean isLoadingInterstitial = false;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(Color.parseColor("#122259"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#122259"));
        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        rootLayout.addView(webView, webParams);

        // Native 320x50 AdMob Banner Ad docked at the bottom center of the screen
        bannerAdView = new AdView(this);
        bannerAdView.setAdSize(AdSize.BANNER);
        bannerAdView.setAdUnitId(BANNER_AD_UNIT_ID);
        FrameLayout.LayoutParams bannerParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        bannerParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        rootLayout.addView(bannerAdView, bannerParams);

        setContentView(rootLayout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.addJavascriptInterface(new AndroidAdMobBridge(), "Android");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");

        // Initialize Google Mobile Ads SDK and load Real Banner, Rewarded, and Interstitial Ads
        MobileAds.initialize(this, initializationStatus -> {
            loadNativeBannerAd();
            preloadRewardedAd(REWARDED_AD_UNIT_ID);
            preloadInterstitialAd(INTERSTITIAL_AD_UNIT_ID);
        });
    }

    private void loadNativeBannerAd() {
        runOnUiThread(() -> {
            if (bannerAdView != null) {
                AdRequest adRequest = new AdRequest.Builder().build();
                bannerAdView.loadAd(adRequest);
            }
        });
    }

    private void preloadRewardedAd(final String adUnitId) {
        runOnUiThread(() -> {
            if (isLoadingRewarded || rewardedAd != null) {
                return;
            }
            isLoadingRewarded = true;
            String targetId = (adUnitId != null && !adUnitId.trim().isEmpty())
                    ? adUnitId.trim()
                    : REWARDED_AD_UNIT_ID;
            AdRequest adRequest = new AdRequest.Builder().build();
            RewardedAd.load(MainActivity.this, targetId, adRequest, new RewardedAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    rewardedAd = ad;
                    isLoadingRewarded = false;
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    rewardedAd = null;
                    isLoadingRewarded = false;
                }
            });
        });
    }

    private void showOrLoadRewardedAd(final String adUnitId) {
        runOnUiThread(() -> {
            final String targetId = (adUnitId != null && !adUnitId.trim().isEmpty())
                    ? adUnitId.trim()
                    : REWARDED_AD_UNIT_ID;

            if (rewardedAd != null) {
                rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override
                    public void onAdDismissedFullScreenContent() {
                        rewardedAd = null;
                        notifyJsRewardDismissed();
                        preloadRewardedAd(targetId);
                    }

                    @Override
                    public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                        rewardedAd = null;
                        preloadRewardedAd(targetId);
                    }
                });

                rewardedAd.show(MainActivity.this, rewardItem -> notifyJsRewardEarned());
            } else {
                // Load and immediately show as soon as ready
                AdRequest adRequest = new AdRequest.Builder().build();
                RewardedAd.load(MainActivity.this, targetId, adRequest, new RewardedAdLoadCallback() {
                    @Override
                    public void onAdLoaded(@NonNull RewardedAd ad) {
                        rewardedAd = ad;
                        rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                            @Override
                            public void onAdDismissedFullScreenContent() {
                                rewardedAd = null;
                                notifyJsRewardDismissed();
                                preloadRewardedAd(targetId);
                            }

                            @Override
                            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                                rewardedAd = null;
                                preloadRewardedAd(targetId);
                            }
                        });
                        rewardedAd.show(MainActivity.this, rewardItem -> notifyJsRewardEarned());
                    }

                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                        rewardedAd = null;
                    }
                });
            }
        });
    }

    private void preloadInterstitialAd(final String adUnitId) {
        runOnUiThread(() -> {
            if (isLoadingInterstitial || interstitialAd != null) {
                return;
            }
            isLoadingInterstitial = true;
            String targetId = (adUnitId != null && !adUnitId.trim().isEmpty())
                    ? adUnitId.trim()
                    : INTERSTITIAL_AD_UNIT_ID;
            AdRequest adRequest = new AdRequest.Builder().build();
            InterstitialAd.load(MainActivity.this, targetId, adRequest, new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull InterstitialAd ad) {
                    interstitialAd = ad;
                    isLoadingInterstitial = false;
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    interstitialAd = null;
                    isLoadingInterstitial = false;
                }
            });
        });
    }

    private void showOrLoadInterstitialAd(final String adUnitId) {
        runOnUiThread(() -> {
            final String targetId = (adUnitId != null && !adUnitId.trim().isEmpty())
                    ? adUnitId.trim()
                    : INTERSTITIAL_AD_UNIT_ID;

            if (interstitialAd != null) {
                interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override
                    public void onAdDismissedFullScreenContent() {
                        interstitialAd = null;
                        preloadInterstitialAd(targetId);
                    }

                    @Override
                    public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                        interstitialAd = null;
                        preloadInterstitialAd(targetId);
                    }
                });
                interstitialAd.show(MainActivity.this);
            } else {
                preloadInterstitialAd(targetId);
            }
        });
    }

    private void notifyJsRewardEarned() {
        runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('admob-reward-earned'));",
                        null
                );
            }
        });
    }

    private void notifyJsRewardDismissed() {
        runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('admob-reward-dismissed'));",
                        null
                );
            }
        });
    }

    public class AndroidAdMobBridge {

        @JavascriptInterface
        public boolean isNativeAdMobAvailable() {
            return true;
        }

        @JavascriptInterface
        public void initializeAdMob(String appId) {
            loadNativeBannerAd();
            preloadRewardedAd(REWARDED_AD_UNIT_ID);
            preloadInterstitialAd(INTERSTITIAL_AD_UNIT_ID);
        }

        @JavascriptInterface
        public void showBannerAd(String unitId) {
            loadNativeBannerAd();
        }

        @JavascriptInterface
        public void showRewardedAd(String unitId) {
            showOrLoadRewardedAd(unitId);
        }

        @JavascriptInterface
        public void showInterstitial(String unitId) {
            showOrLoadInterstitialAd(unitId);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
        if (bannerAdView != null) {
            bannerAdView.resume();
        }
    }

    @Override
    protected void onPause() {
        if (bannerAdView != null) {
            bannerAdView.pause();
        }
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (bannerAdView != null) {
            bannerAdView.destroy();
        }
        super.onDestroy();
    }
}
