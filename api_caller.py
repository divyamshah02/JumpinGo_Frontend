import requests
import random
import string
from datetime import date

API_URL = "http://127.0.0.1:8000/bookings-api/prebooking-api/"
TOKEN = "YOUR_ADMIN_OR_PARK_ADMIN_TOKEN"

HEADERS = {    
    "Content-Type": "application/json"
}

# Your influencer names list
# names = ["Roopal Shah", "Vanitaa Rawat", "Paru Guru", "Ankita Valand", "Heena Gehani", "Jagruti Sheth", "Tinu Ami Shah", "Dixita Patel", "Krishna Patel", "Jagdish Purohit", "Jhanvi Shah", "Mitali Dancer", "Pratima Devnani", "Khushi Shah", "Vd Radadiya", "Pooja Mistry", "Kinjal Patel", "Ushma Desai", "Nirali Naik", "Simi Jariwala", "Komal Bachkaniwala", "Mita Patel", "Annu Gajera", "Hiral Malakiya", "Simmi Bachkaniwala", "Ami Shah", "Shipra", "Shital Kapadia", "Reenu Tanke", "Komal Vora", "Shivani Sopariwala", "Shivani Lakhani", "Gunjan Aghera", "Heena Shah", "Purvi Pachchigar", "Lucy Patel", "Jigna Desaai", "Bhavita Parikh", "Deepa Sonpal", "Sonu Zaveri", "Zilly Gandhi", "Manjri Joshi", "Freshmi", "Manisha Thakkar", "Mita Naik", "Nidhi Juneja", "Sunita Nandwani", "Bharti Tulsiani", "Jalpa Gajera", "Neha Mody", "Niti Vakhari", "Neha Choksi", "Pooja Kalyani", "Khushi Prajapati", "Krishna Bhayani", "Dhara Atara", "Trupti Vala", "Mukti Jhaveri", "Ekta Savani", "Vidhi Paraswani", "Janvi Bhuva", "Ayushi Gajera", "Mily Patel", "Bhavi Khatri", "Shraddha Shah", "Kaksha", "Priyanka Mehta", "Priti Goyal", "Hetvi Thakkar", "Anchor Juhi", "Rj Megha", "Sona Chauhan", "Swati Mali", "Bhavini Chauhan", "Viraj Dholakiya", "Bhumi Patel", "Roshni Solanki", "Bhagvati Ghodadra", "Rupal Shah", "Dipti Shah", "Rajni Jain", "Krunali", "Vaishali Gala", "Nivedita Jain", "Anchal Devnani", "Vaidya Niraj", "Nikki Deol", "Anudeep", "Sahil", "Rupesh Vakil", "Harsha Ma Am", "Mahek", "Mahek Patel", "Vatsal Kapadiya", "Jiya Sosa", "Vatsal Jariwala", "Naznin", "Dhawal Pawar", "Dr Ami", "Hiral Chauhan", "Dr Palak", "Kesha Golakiya", "Dk Dhaval", "Afrin", "Anita Goswami", "Astha Dave", "Vaishnavi", "Rj Meeit Mishra", "Nisha Mishra", "Rachna Gohil", "Pratham Kansara", "Kishan Limbachiya", "Kavya", "Dhvani Sejpal", "Seema Lodha", "Seema Patel", "Manish Reshamwala", "Rakholiya Darshit", "Nilay Chavli", "Nimesh Ramoliya", "Jiya Khurana", "Pari Mona", "Abhikesh", "Hetal Naik", "Nuri Kunwar", "Bhumi Bk", "Lisha Tagariwala", "Roshni Mandir", "Rushi Patel", "Kisu Kathiyawadi", "Anchor Dimple Mishra", "Bansi Dhola", "Jinal Jariwala", "Siya Mistry", "Honey Patel", "Dipika Gautam", "Dhruvisha", "Rj Rashi", "Anusha", "Shruti", "Ruchit", "Rupesh Vrushika", "Vinay Soni", "Rani", "Kesar Bavadiya", "Bipin Nilesh Sai", "Mahima Borana", "Devang Gohil", "Maari Surat", "Kappu", "Rangeelo Maari", "Gujarati Tom", "Henny Mistry", "Neha Dosi", "Jeeja Fashion", "Anshikaa", "Rj Shreya", "Rosika Agrawal", "Rj Rajul", "Vatsal Jariwala", "Durriyatapia", "Ritu Rathi", "Jenish Naik", "Roops Tailor", "Pushpa Patel", "Pragnesh Hirpara", "Ruchika Arora", "Tehmina", "Anchor Tina Doshi", "Tinaa Ranka", "Sweety Pahwa", "Pooja Jangid", "Bharti Tulsiani", "Dhruvita Mahida", "Trivedi Ekta", "Nivedita Jain", "Sheetal Kheni", "Milan Dhakecha", "Nirav Chahwala", "Ruhi", "Dr Rinkle Jariwala", "Sonia Gandhi", "Bhavya Bhogar", "Anuradha Singh", "Ami Patel", "Tanvi Sorathiya", "Anshikaa Sehgal", "The Fashion Street", "Jasmine Kaur", "Kriya Doshi", "Janak Bardoliya", "The Pakka Foodie", "Surti Mayurkumar", "Bhavi Patel", "Taral Patel", "Tanvi Panchal", "Dr Hiral Chauhan", "Gohil Hari Krishu", "Hemani Junejaa", "Mitasha Vakharia", "Little Glove", "Princy On Pluto", "Aadya Tyagi", "Adv Bina Bhagat", "Dhruv Mashru", "Lalu Sonvane", "Viral Chaudhari", "Tanvi Parth Doshi", "Jinal Padia Lakhwala", "Navya Kadiwala", "Radhika Mall", "Foodie Gujarati", "Megha Prajapati", "Aastha Rabari", "Bhavya Arora", "Shama Sakib Vicchi", "Ms Mahii", "Mansi Desai", "Priti Parekh", "Siddhi Mehta", "Aarohi Patel", "Zahabiya", "Roshikaagrawl", "Dinkal Joshi", "Heerr Talaviya", "Varsha", "Heer Dance", "Ankita Jain", "Parag Gherwada", "Payal", "Monika Chakrani", "Parth", "Nayankikani", "Raj", "Harsh", "Surti Expore", "Tanvi", "Bhargav", "Piyu", "Neha Modi", "Dhaval Sonigra", "Fun Food", "Yaritu Fashion", "Vipasha Maheta", "Rajeshwaree Safiwala", "Priya Dhaval Dobariya", "Dj Takshil", "Srushti Patel", "Sneha Virani", "Anjali Rajput", "Rutvi Savaliya", "Swara Gorsiyal", "Mahek Patel", "Darshita Kotadiya", "Anchor Vinita Patel", "Dhruv Parmar", "Jadav Pradip Ranjit Bhai", "Dharmesh Lakkad", "Krunal Golkiya", "Aarya Kejriwal", "Kishan Rakholiya"]

names = [
    ["Aashish Jain", 9016131197, 3], 
["Aman Parakh", 8000876766, 3], 
["Chiran Jain", 8905510761, 3], 
["Rahul Chopra", 9426767389, 3], 
["Dhruval Mehta", 9426064795, 2], 
["Samyak Shah", 9426064798, 2], 
["Krutarth Shah", 9426064799, 2], 
["Saurabh", 7737647476, 5], 
["Gnaanesh", 9979943099, 4], 
["Jainam Sonetha", 9016088595, 7], 
["Shrikant Jain", 9769796196, 5], 
["Yash Nandrecha", 0000000000, 3], 
["Parth Modi", 9512460907, 4], 
["Yash Shah", 9510123172, 2], 
["Mayank Jain", 0000000000, 4], 
["Rushin", 9265588194, 2], 
["Ashish Baid", 0000000000, 3], 
["Arihant Lalwani", 0000000000, 6], 
["Meet Vora", 7817911063, 3], 
["Charmi Solanki", 0000000000, 6], 
["Vivek Bafna", 0000000000, 4], 
["Divesh Jain", 0000000000, 2], 
["Mehul", 0000000000, 2], 
["Dhimant Doshi", 0000000000, 2], 
["Moxesh Ajbani", 7434083699, 1], 
["Chiran Jain", 0000000000, 3], 
["Srushti Bothra", 9978487254, 4], 
["Chirag Doshi", 0000000000, 2], 
["Manoj Jain", 0000000000, 2], 
["Yash Jain", 0000000000, 2], 
["Himanshu", 9833668333, 2], 
["Riya", 9428580605, 4], 
["Nimesh", 9428395953, 6], 
["Rushabh Shah", 9409260049, 4], 
["Ravi Golwala", 0000000000, 4], 
["Jay", 8460065166, 4], 
["Nishi", 0000000000, 2], 
["Rajeshh", 9099899758, 3], 
["Sahaj Rathod", 8849472362, 2], 
["Harsh Shah", 6359203535, 2], 
["Nitin Shah", 0000000000, 2], 
["Hiya Mody", 9537680881, 4], 
["Rk", 9033300072, 2], 
["Rahul", 8849298056, 5], 
["Rushabh Shah", 8905155285, 1], 
["Nirveg Jain", 9727717111, 5], 
["Yesha Kanthed", 9825066202, 7], 
["Maanavv Jain", 9974021051, 7], 
["Jinal Shah", 7990225666, 5], 
["Yash Nandrecha", 7990847204, 3], 
["Manas Bapna", 9662344961, 4], 
["Akshay", 8000330990, 3], 
["Tanish Kothari", 9773464971, 4], 
["Labdhi", 7621054987, 2], 
["Sakshi", 9998038075, 4], 
["Gaurav", 0000000000, 5], 
["Harsh", 9106419672, 4], 
["Yash", 7021779763, 4], 
["Siddharth Chhallani", 9998526288, 2], 
["Harshal Jain", 9461021531, 2], 
["Rahul Mehta", 7016564187, 3], 
["Milan", 9429818075, 5], 
["Harsh", 8866987781, 4], 
["Deepak", 8905434203, 4], 
["Rishab Shetiya", 6352993682, 5], 
["Hardik Dhariwal", 7874264834, 3], 
["Soumya Dhariwal", 9924111880, 3], 
["Pooja Dhariwal", 9510388068, 3], 
["Jainam Dhariwal", 9879711880, 3], 
["Naman Dhariwal", 8980021188, 3], 
["Siddhi Dhariwal", 6359840034, 3], 
["Abhishek Dhariwal", 8758091188, 3], 
["Darshna Dhariwal", 8487087822, 3], 
["Mansi Dhariwal", 9545187813, 3], 
["Chandra Dhariwal", 9687091990, 3], 
["Dimple Dhariwal", 9638753416, 3], 
["Zeel Jain", 9824611331, 3], 
["Kaivalya", 9979773544, 3]

]

used_numbers = set()

def generate_unique_mobile():
    while True:
        number = random.choice(['000']) + ''.join(random.choices(string.digits, k=7))
        if number not in used_numbers:
            used_numbers.add(number)
            return number

for name in names:
    customer_number = name[1] if name[1] != 0000000000 else generate_unique_mobile()
    payload = {
        "customer_name": name[0],
        "customer_number": generate_unique_mobile(),
        "num_people": name[2],
        "visit_date": str(date.today()),   # change if needed
        "is_an_invite": True,
        "reference": "influencer",
        "approved_amount": 0,
        "approval_status": "approved",
        "status": "approved"
    }

    response = requests.post(API_URL, json=payload, headers=HEADERS)

    if response.status_code == 201:
        print(f"✅ Created: {name}")
    else:
        print(f"❌ Failed: {name}", response.text)
