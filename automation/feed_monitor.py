import os
import json
import requests
import feedparser
from datetime import datetime

# CONFIGURATION
# Set these in your environment variables for security
ONESIGNAL_APP_ID = os.getenv('ONESIGNAL_APP_ID', 'YOUR_APP_ID_HERE')
ONESIGNAL_REST_KEY = os.getenv('ONESIGNAL_REST_KEY', 'YOUR_REST_KEY_HERE')

# PATHS
ASSETS_DIR = 'tamilnewmovies_sanshob_up'
STATE_FILE = 'automation/last_seen.json'

def send_onesignal_notification(title, message, link=None):
    """Sends a push notification via OneSignal REST API"""
    url = "https://onesignal.com/api/v1/notifications"
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Basic {ONESIGNAL_REST_KEY}"
    }
    
    payload = {
        "app_id": ONESIGNAL_APP_ID,
        "included_segments": ["All"],
        "headings": {"en": title},
        "contents": {"en": message}
    }
    
    if link:
        payload["url"] = link  # Device opens this link when clicked

    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        print(f"Notification Status: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error sending notification: {e}")

def get_latest_item(feed_url):
    """Fetches the latest item from an RSS feed"""
    try:
        feed = feedparser.parse(feed_url)
        if feed.entries:
            latest = feed.entries[0]
            return {
                'id': latest.get('id', latest.get('link')),
                'title': latest.get('title', 'New Content'),
                'link': latest.get('link')
            }
    except Exception as e:
        print(f"Error parsing feed {feed_url}: {e}")
    return None

def monitor():
    # Load previous state
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            last_seen = json.load(f)
    else:
        last_seen = {}

    feeds_to_check = []

    # 1. Check all JSON files in assets
    for filename in os.listdir(ASSETS_DIR):
        if filename.endswith('.json'):
            path = os.path.join(ASSETS_DIR, filename)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # Handle array-based feed lists (like news_channels.json)
                    if isinstance(data, list):
                        for item in data:
                            if item.get('provider') == 'rss' and 'arguments' in item:
                                feeds_to_check.append({
                                    'name': item.get('title'),
                                    'url': item['arguments'][0]
                                })
                    
                    # Handle config.json structure
                    elif isinstance(data, dict):
                        # RSS News
                        if 'rss_news' in data:
                            for item in data['rss_news']:
                                feeds_to_check.append({
                                    'name': item.get('title'),
                                    'url': item.get('url')
                                })
                        # YouTube Channels
                        if 'youtube_channels' in data:
                            for item in data['youtube_channels']:
                                channel_id = item.get('channel_id')
                                rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
                                feeds_to_check.append({
                                    'name': item.get('name'),
                                    'url': rss_url
                                })
            except Exception as e:
                print(f"Error reading {filename}: {e}")

    # 2. Check each feed for updates
    print(f"Checking {len(feeds_to_check)} feeds at {datetime.now()}...")
    
    new_state = {}
    notifications_sent = 0

    for feed in feeds_to_check:
        url = feed['url']
        if not url: continue
        
        latest = get_latest_item(url)
        if latest:
            new_state[url] = latest['id']
            
            # If we've seen this feed before but the ID is different
            if url in last_seen and last_seen[url] != latest['id']:
                print(f"New content found in {feed['name']}: {latest['title']}")
                send_onesignal_notification(
                    title=f"New from {feed['name']}! 🔔",
                    message=latest['title'],
                    link=latest['link']
                )
                notifications_sent += 1
            elif url not in last_seen:
                print(f"Tracking new feed: {feed['name']}")
    
    # Save the updated state
    # Merge existing state to not lose feeds that might have failed this time
    last_seen.update(new_state)
    with open(STATE_FILE, 'w') as f:
        json.dump(last_seen, f, indent=4)

    print(f"Done. Sent {notifications_sent} notifications.")

if __name__ == "__main__":
    monitor()
