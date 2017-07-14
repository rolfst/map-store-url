**Url store**

The role for microservice is to provide a code that returns an url for a room,
so different devices can connect to the same room and thus interact with each other. 
This url should not be stored indefinitely, but have a ttl of 3 minutes 
The code should also be unique while it is still active. 

****Security:****
Only applications from our known addresses list should be able to store an url and generate a code. 
Everyone that knows the code should be able to enter the code so also unknown addresses. 


Endpoints:  
```
  POST /generateconnectcode 
    Param: url 
    Context: known client. 
	return: url, connectKey, counter
  GET /consummeconnectcode
  	Param: connectKey 
	return: url, connectKey  
```

