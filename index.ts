import crypto from 'crypto'
import { promises as fs } from 'fs';
import Express from 'express'
import {z} from 'zod'

import bodyParser from 'body-parser'

const app = new Express()

app.use(bodyParser.json())

const PORT = 3000

const TodoSchema = z.object({
    name: z.string().min(3).max(255),
    createdAt: z.date(),
    updatedAt: z.date(),
    id: z.string(),
    isDone: z.boolean()
})

const TodosScheme = z.object({ 
    todos: z.array(TodoSchema)
})


type TodoSchemaType = z.infer<typeof TodoSchema>
type TodosSchemaType = z.infer<typeof TodosScheme>



class Todo {
    id: string
    isDone: boolean = false
    createdAt: Date
    updatedAt: Date
    name: string

    constructor(name){
        this.name = name
        this.createdAt = new Date()
        this.updatedAt = new Date()
        this.id = crypto.randomUUID();
    }

    setCreatedAt(date: Date){
        this.createdAt = date
        return this
    }

    setUpdatedAt(date: Date){
        this.updatedAt = date
        return this
    }


    setId(id: string){
        this.id = id
        return this
    }

    makeItDone(){
        this.isDone = true
        return this
    }

    toJson(): TodoSchemaType{
        return {
            name: this.name,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            id: this.id,
            isDone: this.isDone
        }
    }
}


class Todos {
    todos: Todo[] = []

    add(todo: Todo){
        this.todos.push(todo)
    }

    toJson(): TodosSchemaType{
        return {
            todos: this.todos.map(todo => todo.toJson())   
        }
        
    }

}

class TodoTextRepository{

    async save(todo: Todo){
        const data = await fs.readFile('./test.json', 'utf8')
        const results = JSON.parse(data)
        results.push(todo.toJson())

        await fs.writeFile('./test.json', JSON.stringify(results));
    }

    async findAll(pagination: {page: number}, sort: {field: string, order: string}){
        const data = await fs.readFile('./test.json', 'utf8')
        let results = JSON.parse(data)
        const perPage = 10

        const start = (pagination.page - 1) * perPage
        const end = start + perPage

        console.log({results, sort})
        results = results.toSorted((a, b) => {
            if(sort.field=='name' && sort.order == 'asc') return a[sort.field].localeCompare(b[sort.field])
            else if(sort.field=='name' && sort.order == 'desc') return b[sort.field].localeCompare([sort.field])
            else if(sort.order === 'asc'){
                return a[sort.field] - b[sort.field]
            }else{
                return b[sort.field] - a[sort.field]
            }
        })

        console.log({results})
        results = results.slice(start, end)
        


        const todos = new Todos()


        for(let result of results){
            const newTodo = new Todo(result.name)
            newTodo.setCreatedAt(new Date(result.createdAt))
                   .setUpdatedAt(new Date(result.updatedAt))
                   .setId(result.id)

            todos.add(newTodo)
        }

        return todos

    }

    async remove(id: string){
        const data = await fs.readFile('./test.json', 'utf8')
        const results = JSON.parse(data)

        const newResults = results.filter(result => result.id !== id)

        await fs.writeFile('./test.json', JSON.stringify(newResults))
    }

    async findById(id: string) : Promise<Todo>{
        const data = await fs.readFile('./test.json', 'utf8')
        const results = JSON.parse(data)

        const result = results.find(result => result.id === id)


        const newTodo = new Todo(result.name)

        return newTodo.setCreatedAt(new Date(result.createdAt))
                      .setUpdatedAt(new Date(result.updatedAt))
                      .setId(result.id)
    }
}


// create todo
async function createTodo({name}: {name: string}){
    const todoRepository = new TodoTextRepository()
    const todo = new Todo(name)
    await todoRepository.save(todo)
    return todo.toJson()
}

// make todo done

async function makeItDone(todoId: string){
    const todoRepository = new TodoTextRepository()
    // get persistent data
    const todo = await todoRepository.findById(todoId)
    todo.makeItDone()

    todoRepository.save(todo)

    return todo.toJson()
}


async function listAllTodos(pagination: {page: number}, sort: {field: string, order: string}){
    const todoRepository = new TodoTextRepository()
    const todos = await todoRepository.findAll(pagination, sort)

    return todos.toJson()

}

async function removeTodo(todoId){
    const todoRepository = new TodoTextRepository()
    const todo = await todoRepository.remove(todoId)
}






const createTodoSchema = z.object({
    name: z.string().min(3).max(255)
})






// Read
// sort by createdAt, updatedAt, des, asc (order will come from frontend)


app.get('/todos', async (req, res) => {
    const field = (req.query.field ?? 'name') as string
    const order = (req.query.order ?? 'asc') as string
    const page = (req.query.page ?? 1) as number

    const todos = await listAllTodos(
        {page},
        {
            field,
            order
        }
    )
    
    TodosScheme.parse(todos)
    res.json(todos)
})





// Create
app.post('/todos', async (req, res) => {

    try{
        //validate received data
        const params = createTodoSchema.parse(req.body)


        const newTodo = await createTodo({name: params.name})

        // validate sent data
        TodoSchema.parse(newTodo)

        res.json(newTodo)
    }catch(e){
        res.status(400).json({
            message: e.errors
        })
    }
   
})

// Create
app.put('/todos/:id', async (req, res) => {
    const updatedTodo = await makeItDone(req.params.id)
    res.json(updatedTodo)
})

app.delete('/todos/:id', async (req, res) => {
    const updatedTodo = await removeTodo(req.params.id)
    res.json({
        message: 'removed'
    })
})


app.get('/', (req, res) => {
    res.send('Hello World!')
})


app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
  })




// async function main(){

//     console.log(await listAllTodos())


//     const myNewTodo = await createTodo()
    
//     console.log(await listAllTodos())


//     await removeTodo(myNewTodo.id)

//     console.log(await listAllTodos())
//     // await removeTodo(myNewTodo.id)
    
//     // console.log(myNewTodo)

//     // const updatedTodo = await makeItDone(myNewTodo.id)

//     // console.log(updatedTodo)

//     // const todosJson =await listAllTodos()

//     // console.log(todosJson)

//     // await removeTodo(myNewTodo.id)

//     // console.log(await listAllTodos())
    

// }




// main()


// // list all todos





// // delete todo

