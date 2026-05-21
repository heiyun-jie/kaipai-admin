import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import DetailBlock from './components/business/DetailBlock.vue'
import DetailGrid from './components/business/DetailGrid.vue'
import StackCell from './components/tables/StackCell.vue'
import TableActions from './components/tables/TableActions.vue'
import { pinia } from './stores'
import { router } from './router'
import './styles/index.scss'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.component('DetailBlock', DetailBlock)
app.component('DetailGrid', DetailGrid)
app.component('StackCell', StackCell)
app.component('TableActions', TableActions)
app.mount('#app')
