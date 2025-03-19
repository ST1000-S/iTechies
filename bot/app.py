from flask import Flask, request, jsonify
import openai
from config import OPENAI_API_KEY
import stripe

app = Flask(__name__)
openai.api_key = OPENAI_API_KEY
stripe.api_key = 'your_stripe_secret_key'

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    if not data.get('message'):
        return jsonify({'error': 'No message provided'}), 400
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": data['message']}]
        )
        return jsonify({'response': response.choices[0].message.content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/subscribe', methods=['POST'])
def subscribe():
    try:
        customer = stripe.Customer.create(
            email=request.json.get('email'),
            source=request.json.get('token')
        )
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{'price': 'price_monthly_subscription'}],
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
