# 移动端 App 集成设计

## 概述

本文档详细描述了如何将 Interactive Feedback MCP 的 Cloudflare Workers 版本与移动端 App 进行集成，实现跨平台的实时反馈功能。

## 集成架构

### 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI 助手环境    │    │ Cloudflare      │    │   移动端环境     │
│                │    │ Workers 网络     │    │                │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ AI 助手     │ │◄──►│ │ API 服务    │ │◄──►│ │ iOS App     │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│                │    │ │ WebSocket   │ │◄──►│ │ Android App │ │
│                │    │ │ 管理器      │ │    │ └─────────────┘ │
│                │    │ └─────────────┘ │    │ ┌─────────────┐ │
│                │    │ ┌─────────────┐ │    │ │ 推送服务    │ │
│                │    │ │ 推送通知    │ │◄──►│ │ FCM/APNs    │ │
│                │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## App 端技术实现

### 1. WebSocket 客户端实现

#### iOS (Swift) 实现
```swift
import Foundation
import Network

class FeedbackWebSocketClient {
    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private let sessionId: String
    private let apiKey: String
    
    init(sessionId: String, apiKey: String) {
        self.sessionId = sessionId
        self.apiKey = apiKey
        self.urlSession = URLSession(configuration: .default)
    }
    
    func connect() {
        guard let url = URL(string: "wss://api.feedback.example.com/ws/\(sessionId)?apiKey=\(apiKey)&clientType=app") else {
            return
        }
        
        webSocketTask = urlSession?.webSocketTask(with: url)
        webSocketTask?.resume()
        
        // 开始接收消息
        receiveMessage()
        
        // 发送 App 注册消息
        sendAppRegistration()
    }
    
    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self?.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                
                // 继续接收下一条消息
                self?.receiveMessage()
                
            case .failure(let error):
                print("WebSocket receive error: \(error)")
                self?.attemptReconnect()
            }
        }
    }
    
    private func handleMessage(_ messageText: String) {
        guard let data = messageText.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }
        
        switch type {
        case "connection_established":
            print("WebSocket connected successfully")
            
        case "feedback_submitted":
            handleFeedbackSubmitted(json["data"] as? [String: Any])
            
        case "session_expired":
            handleSessionExpired()
            
        case "push_notification_request":
            handlePushNotificationRequest(json["data"] as? [String: Any])
            
        default:
            print("Unknown message type: \(type)")
        }
    }
    
    private func sendAppRegistration() {
        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? ""
        let message = [
            "type": "app_register",
            "data": [
                "deviceId": deviceId,
                "platform": "ios",
                "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0",
                "pushToken": getPushToken()
            ]
        ]
        
        sendMessage(message)
    }
    
    private func sendMessage(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let text = String(data: data, encoding: .utf8) else {
            return
        }
        
        webSocketTask?.send(.string(text)) { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        }
    }
}
```

#### Android (Kotlin) 实现
```kotlin
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class FeedbackWebSocketClient(
    private val sessionId: String,
    private val apiKey: String
) {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    fun connect() {
        val url = "wss://api.feedback.example.com/ws/$sessionId?apiKey=$apiKey&clientType=app"
        val request = Request.Builder()
            .url(url)
            .build()
        
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                println("WebSocket connected")
                sendAppRegistration()
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                handleMessage(text)
            }
            
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                println("WebSocket error: ${t.message}")
                attemptReconnect()
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                println("WebSocket closed: $reason")
            }
        })
    }
    
    private fun handleMessage(messageText: String) {
        try {
            val json = JSONObject(messageText)
            val type = json.getString("type")
            
            when (type) {
                "connection_established" -> {
                    println("WebSocket connected successfully")
                }
                
                "feedback_submitted" -> {
                    handleFeedbackSubmitted(json.optJSONObject("data"))
                }
                
                "session_expired" -> {
                    handleSessionExpired()
                }
                
                "push_notification_request" -> {
                    handlePushNotificationRequest(json.optJSONObject("data"))
                }
                
                else -> {
                    println("Unknown message type: $type")
                }
            }
        } catch (e: Exception) {
            println("Error parsing message: ${e.message}")
        }
    }
    
    private fun sendAppRegistration() {
        val deviceId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        )
        
        val message = JSONObject().apply {
            put("type", "app_register")
            put("data", JSONObject().apply {
                put("deviceId", deviceId)
                put("platform", "android")
                put("appVersion", BuildConfig.VERSION_NAME)
                put("pushToken", getPushToken())
            })
        }
        
        webSocket?.send(message.toString())
    }
}
```

### 2. 推送通知集成

#### iOS APNs 集成
```swift
import UserNotifications

class PushNotificationManager {
    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }
    
    func handlePushNotification(_ userInfo: [AnyHashable: Any]) {
        guard let sessionId = userInfo["sessionId"] as? String,
              let deepLink = userInfo["deepLink"] as? String else {
            return
        }
        
        // 处理深度链接，打开反馈界面
        openFeedbackInterface(sessionId: sessionId, deepLink: deepLink)
    }
    
    private func openFeedbackInterface(sessionId: String, deepLink: String) {
        // 实现打开反馈界面的逻辑
        NotificationCenter.default.post(
            name: .openFeedbackInterface,
            object: nil,
            userInfo: ["sessionId": sessionId, "deepLink": deepLink]
        )
    }
}
```

#### Android FCM 集成
```kotlin
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class FeedbackFirebaseMessagingService : FirebaseMessagingService() {
    
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        val sessionId = remoteMessage.data["sessionId"]
        val deepLink = remoteMessage.data["deepLink"]
        
        if (sessionId != null && deepLink != null) {
            handleFeedbackNotification(sessionId, deepLink)
        }
    }
    
    private fun handleFeedbackNotification(sessionId: String, deepLink: String) {
        val intent = Intent(this, FeedbackActivity::class.java).apply {
            putExtra("sessionId", sessionId)
            putExtra("deepLink", deepLink)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("需要您的反馈")
            .setContentText("AI 助手正在等待您的确认")
            .setSmallIcon(R.drawable.ic_feedback)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        
        NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification)
    }
}
```

### 3. 反馈界面实现

#### 跨平台反馈界面 (React Native)
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';

const FeedbackScreen = ({ route }) => {
  const { sessionId, apiKey } = route.params;
  const [sessionData, setSessionData] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [freeText, setFreeText] = useState('');
  const [webSocket, setWebSocket] = useState(null);
  
  useEffect(() => {
    // 获取会话数据
    fetchSessionData();
    
    // 建立 WebSocket 连接
    connectWebSocket();
    
    return () => {
      if (webSocket) {
        webSocket.close();
      }
    };
  }, []);
  
  const fetchSessionData = async () => {
    try {
      const response = await fetch(
        `https://api.feedback.example.com/api/feedback/${sessionId}/status`,
        {
          headers: {
            'X-API-Key': apiKey
          }
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setSessionData(data.data);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
    }
  };
  
  const connectWebSocket = () => {
    const ws = new WebSocket(
      `wss://api.feedback.example.com/ws/${sessionId}?apiKey=${apiKey}&clientType=app`
    );
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      
      // 发送 App 注册消息
      ws.send(JSON.stringify({
        type: 'app_register',
        data: {
          deviceId: 'device-uuid',
          platform: Platform.OS,
          appVersion: '1.0.0'
        }
      }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };
    
    setWebSocket(ws);
  };
  
  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'session_expired':
        Alert.alert('会话已过期', '请重新获取反馈链接');
        break;
        
      case 'feedback_submitted':
        Alert.alert('提交成功', '您的反馈已成功提交');
        break;
    }
  };
  
  const submitFeedback = async () => {
    try {
      const response = await fetch(
        `https://api.feedback.example.com/api/feedback/${sessionId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            selectedOptions,
            freeText,
            metadata: {
              platform: Platform.OS,
              timestamp: new Date().toISOString()
            }
          })
        }
      );
      
      const data = await response.json();
      if (data.success) {
        Alert.alert('提交成功', '您的反馈已成功提交');
      } else {
        Alert.alert('提交失败', data.error.message);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('提交失败', '网络错误，请重试');
    }
  };
  
  if (!sessionData) {
    return (
      <View style={styles.loading}>
        <Text>加载中...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>反馈请求</Text>
      <Text style={styles.message}>{sessionData.message}</Text>
      
      {sessionData.predefinedOptions && (
        <View style={styles.optionsContainer}>
          {sessionData.predefinedOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.option,
                selectedOptions.includes(option) && styles.selectedOption
              ]}
              onPress={() => toggleOption(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <TextInput
        style={styles.textInput}
        placeholder="请输入您的反馈..."
        multiline
        value={freeText}
        onChangeText={setFreeText}
      />
      
      <TouchableOpacity style={styles.submitButton} onPress={submitFeedback}>
        <Text style={styles.submitButtonText}>提交反馈</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## 深度链接 (Deep Link) 设计

### URL Scheme 设计
```
// iOS URL Scheme
feedback://session/{sessionId}?apiKey={apiKey}

// Android Intent Filter
intent://session/{sessionId}?apiKey={apiKey}#Intent;scheme=feedback;package=com.example.feedback;end

// Universal Link (iOS) / App Link (Android)
https://app.feedback.example.com/session/{sessionId}?apiKey={apiKey}
```

### 深度链接处理
```javascript
// React Native 深度链接处理
import { Linking } from 'react-native';

const handleDeepLink = (url) => {
  const urlParts = url.split('/');
  const sessionId = urlParts[urlParts.length - 1].split('?')[0];
  const urlParams = new URLSearchParams(url.split('?')[1]);
  const apiKey = urlParams.get('apiKey');
  
  if (sessionId && apiKey) {
    // 导航到反馈界面
    navigation.navigate('Feedback', { sessionId, apiKey });
  }
};

// 监听深度链接
useEffect(() => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });
  
  return () => subscription?.remove();
}, []);
```

## 安全考虑

### 1. API Key 管理
- 使用短期有效的会话 Token 替代长期 API Key
- 实现 Token 刷新机制
- 在 App 端安全存储敏感信息

### 2. 深度链接安全
- 验证深度链接的合法性
- 防止恶意链接攻击
- 实现链接签名验证

### 3. 推送通知安全
- 验证推送消息来源
- 加密敏感推送内容
- 实现推送消息防重放

## 性能优化

### 1. 连接管理
- 实现智能重连机制
- 优化心跳频率
- 处理网络切换场景

### 2. 数据缓存
- 缓存会话数据减少网络请求
- 实现离线模式支持
- 优化数据同步策略

### 3. 电池优化
- 合理设置 WebSocket 心跳间隔
- 在后台时降低连接频率
- 使用推送通知替代长连接

## 测试策略

### 1. 功能测试
- WebSocket 连接稳定性测试
- 推送通知到达率测试
- 深度链接跳转测试
- 多端同步功能测试

### 2. 性能测试
- 网络切换场景测试
- 低网络环境测试
- 电池消耗测试
- 内存使用测试

### 3. 兼容性测试
- 不同操作系统版本测试
- 不同设备型号测试
- 不同网络环境测试
